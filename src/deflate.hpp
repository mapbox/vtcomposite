#pragma once

// libdeflate
#include <libdeflate.h>
// std
#include <limits>
#include <stdexcept>
#include <string>
#include <memory>

namespace deflate {

inline bool is_zlib(char const* data, std::size_t size) noexcept
{
    return size > 2 &&
           (static_cast<uint8_t>(data[0]) == 0x78 &&
            (static_cast<uint8_t>(data[1]) == 0x9C ||
             static_cast<uint8_t>(data[1]) == 0x01 ||
             static_cast<uint8_t>(data[1]) == 0xDA ||
             static_cast<uint8_t>(data[1]) == 0x5E));
}

inline bool is_gzip(char const* data, std::size_t size) noexcept
{
    return size > 2 && (static_cast<uint8_t>(data[0]) == 0x1F && static_cast<uint8_t>(data[1]) == 0x8B);
}

inline bool is_compressed(char const* data, std::size_t size) noexcept
{
    return is_gzip(data, size) || is_zlib(data, size);
}

class Compressor
{
    struct cleanup_compressor
    {
        void operator()(libdeflate_compressor* ptr) const
        {
            if (ptr) libdeflate_free_compressor(ptr);
        }
    };
    std::size_t max_;
    int level_;
    std::unique_ptr<libdeflate_compressor, cleanup_compressor> compressor_;
    // make noncopyable
    Compressor(Compressor const&) = delete;
    Compressor& operator=(Compressor const&) = delete;

  public:
    Compressor(int level = 6,
               std::size_t max_bytes = 2000000000) // by default refuse operation if uncompressed data is > 2GB
        : max_{max_bytes},
          level_{level},
          compressor_{libdeflate_alloc_compressor(level_)}
    {
        if (!compressor_)
        {
            throw std::runtime_error("libdeflate_alloc_compressor failed");
        }
    }

    template <typename OutputType>
    void operator()(OutputType& output,
                    char const* data,
                    std::size_t size) const
    {
        if (size > max_)
        {
            throw std::runtime_error("size may use more memory than intended when decompressing");
        }

        std::size_t max_compressed_size = libdeflate_gzip_compress_bound(compressor_.get(), size);
        // TODO: sanity check this before allocating
        if (max_compressed_size > output.size())
        {
            output.resize(max_compressed_size);
        }

        std::size_t actual_compressed_size = libdeflate_gzip_compress(compressor_.get(),
                                                                      data,
                                                                      size,
                                                                      const_cast<char*>(output.data()),
                                                                      max_compressed_size);
        if (actual_compressed_size == 0)
        {
            throw std::runtime_error("actual_compressed_size 0");
        }
        output.resize(actual_compressed_size);
    }
};

class Decompressor
{
    struct cleanup_decompressor
    {
        void operator()(libdeflate_decompressor* ptr) const
        {
            if (ptr) libdeflate_free_decompressor(ptr);
        }
    };

    std::size_t const max_;
    std::unique_ptr<libdeflate_decompressor, cleanup_decompressor> decompressor_;
    // noncopyable
    Decompressor(Decompressor const&) = delete;
    Decompressor& operator=(Decompressor const&) = delete;

  public:
    Decompressor(std::size_t max_bytes = 2147483648u) // by default refuse operation if required uutput buffer is > 2GB
        : max_{max_bytes},
          decompressor_{libdeflate_alloc_decompressor(), cleanup_decompressor()}
    {
        if (!decompressor_)
        {
            throw std::runtime_error("libdeflate_alloc_decompressor failed");
        }
    }

    template <typename OutputType>
    void operator()(OutputType& output,
                    char const* data,
                    std::size_t size) const
    {
        if (is_gzip(data, size))
            apply(output, libdeflate_gzip_decompress, data, size);
        else if (is_zlib(data, size))
            apply(output, libdeflate_zlib_decompress, data, size);
        //else throw std::runtime_error("bad data");
    }

    template <typename OutputType, typename Fun>
    void apply(OutputType& output, Fun fun,
               char const* data,
               std::size_t size) const
    {
        std::size_t actual_size;
        std::size_t uncompressed_size_guess = std::min(size * 4, max_);
        output.resize(uncompressed_size_guess);
        libdeflate_result result;
        for (;;)
        {
            result = fun(decompressor_.get(),
                         data,
                         size,
                         const_cast<char*>(output.data()),
                         output.size(), &actual_size);
            if (result != LIBDEFLATE_INSUFFICIENT_SPACE)
            {
                break;
            }
            if (output.size() == max_)
            {
                throw std::runtime_error("request to resize output buffer can't exceed maximum limit");
            }
            std::size_t new_size = std::min((output.capacity() << 1) - output.size(), max_);
            output.resize(new_size);
        }

        if (result == LIBDEFLATE_SHORT_OUTPUT)
        {
            throw std::runtime_error("short output: did not succeed");
        }
        else if (result == LIBDEFLATE_BAD_DATA)
        {
            throw std::runtime_error("bad data: did not succeed");
        }
        else if (result != LIBDEFLATE_SUCCESS)
        {
            throw std::runtime_error("did not succeed");
        }
        output.resize(actual_size);
    }
};

} // namespace deflate
