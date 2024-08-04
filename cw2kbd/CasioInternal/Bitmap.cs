using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Runtime.Intrinsics.Arm;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using static cw2tools.CasioInternal.Static;

namespace cw2tools.CasioInternal
{
    internal static unsafe class Bitmap
    {
        static bool[] BytesToBitSet(byte* bytes, nint length)
        {
            bool[] bitSet = new bool[length * 8];
            if (bytes + length >= rom + 0x60000)
            {
                return bitSet;
            }
            for (int i = 0; i < length; i++)
            {
                for (int j = 0; j < 8; j++)
                {
                    // 位掩码用于检查每个位
                    bitSet[i * 8 + (7 - j)] = (bytes[i] & (1 << j)) != 0;
                }
            }
            return bitSet;
        }
        static bool[] BytesToBitSetLE(byte* bytes, nint length)
        {
            bool[] bitSet = new bool[length * 8];
            if (bytes + length >= rom + 0x60000)
            {
                return bitSet;
            }
            for (int i = 0; i < length; i += 2)
            {
                for (int j = 0; j < 8; j++)
                {
                    // 位掩码用于检查每个位
                    bitSet[(i + 1) * 8 + j] = (bytes[i] & (0x80 >> j)) != 0;
                }
                for (int j = 0; j < 8; j++)
                {
                    // 位掩码用于检查每个位
                    bitSet[i * 8 + j] = (bytes[i + 1] & (0x80 >> j)) != 0;
                }
            }
            return bitSet;
        }
        public static WriteableBitmap Clip(nint bs, int index, int width, int height)
        {
            WriteableBitmap b = new(width, height, 96, 96, PixelFormats.Bgr32, null);
            b.Lock();
            byte* buf = (byte*)b.BackBuffer;
            {
                // 这是一个周期性问题，我们有 index*width，我们期望转换成16*index2 + n
                var wi = width * index;
                var index2 = (wi >> 4);
                var n = wi & 15;

                var array1 = BytesToBitSetLE(rom + bs + 2 * index2 * height, 32 * height);
                int d = 0;
                for (int j = 0; j < height; j++)
                {
                    int e = n + d;
                    for (int i = 0; i < (16 - n); i++)
                    {
                        buf[j * b.BackBufferStride + i * 4] = buf[j * b.BackBufferStride + i * 4 + 1] = buf[j * b.BackBufferStride + i * 4 + 2]
                            = (byte)(!array1[e++] ? 255 : 0);
                    }
                    d += 16;
                }
                for (int j = 0; j < height; j++)
                {
                    int e = d;
                    for (int i = (16 - n); i < width; i++)
                    {
                        buf[j * b.BackBufferStride + i * 4] = buf[j * b.BackBufferStride + i * 4 + 1] = buf[j * b.BackBufferStride + i * 4 + 2]
                            = (byte)(!array1[e++] ? 255 : 0);
                    }
                    d += 16;
                }
            }
            b.AddDirtyRect(new Int32Rect(0, 0, width, height));
            b.Unlock();
            return b;
        }
        public static WriteableBitmap Clip2(nint bs, int index, int width, int height)
        {
            WriteableBitmap b = new(width, height, 96, 96, PixelFormats.Bgr32, null);
            b.Lock();
            byte* buf = (byte*)b.BackBuffer;
            {
                // 这是一个周期性问题，我们有 index*width，我们期望转换成8*index2 + n
                var wi = width * index;
                var index2 = (wi / 8);
                var n = wi % 8;

                var array1 = BytesToBitSet(rom + bs + index2 * height, 32 * height);
                int d = 0;
                for (int j = 0; j < height; j++)
                {
                    int e = n + d;
                    for (int i = 0; i < (8 - n); i++)
                    {
                        buf[j * b.BackBufferStride + i * 4] = buf[j * b.BackBufferStride + i * 4 + 1] = buf[j * b.BackBufferStride + i * 4 + 2]
                            = (byte)(!array1[e++] ? 255 : 0);
                    }
                    d += 8;
                }
                for (int j = 0; j < height; j++)
                {
                    int e = d;
                    for (int i = (8 - n); i < width; i++)
                    {
                        buf[j * b.BackBufferStride + i * 4] = buf[j * b.BackBufferStride + i * 4 + 1] = buf[j * b.BackBufferStride + i * 4 + 2]
                            = (byte)(!array1[e++] ? 255 : 0);
                    }
                    d += 8;
                }
            }
            b.AddDirtyRect(new Int32Rect(0, 0, width, height));
            b.Unlock();
            return b;
        }
        public static void Set(nint bs, int index, int width, int height, BitmapSource src)
        {
            byte* data = stackalloc byte[height * width * 4];
            src.CopyPixels(new Int32Rect(0, 0, Math.Min(src.PixelWidth, width), Math.Min(src.PixelHeight, height)), (nint)data, height * width * 4, width * 4);
            ushort* buf = (ushort*)(rom + bs);
            {
                // 这是一个周期性问题，我们有 index*width，我们期望转换成16*index2 + n
                var wi = width * index;
                var index2 = (wi >> 4);
                var n = wi & 15;

                // int d = 0;
                for (int j = 0; j < height; j++)
                {
                    int e = n;
                    for (int i = 0; i < Math.Min(16 - n, width); i++)
                    {
                        var b = data[j * width * 4 + i * 4 + 2] != 0;
                        if (!b)
                            buf[index2 * height + j] |= (ushort)((0x8000) >> (e++));
                        else
                            buf[index2 * height + j] &= (ushort)~((0x8000) >> (e++));
                    }
                }
                for (int j = 0; j < height; j++)
                {
                    int e = 0;
                    for (int i = (16 - n); i < width; i++)
                    {
                        var b = data[j * width * 4 + i * 4 + 2] != 0;
                        if (!b)
                            buf[index2 * height + j + height] |= (ushort)((0x8000) >> (e++));
                        else
                            buf[index2 * height + j + height] &= (ushort)~((0x8000) >> (e++));
                    }
                }
            }
        }
        public static void Set2(nint bs, int index, int width, int height, BitmapSource src)
        {
            byte* data = stackalloc byte[height * width * 4];
            src.CopyPixels(new Int32Rect(0, 0, width, height), (nint)data, height * width * 4, width * 4);
            byte* buf = (byte*)(rom + bs);
            {
                // 这是一个周期性问题，我们有 index*width，我们期望转换成8*index2 + n
                var wi = width * index;
                var index2 = (wi >> 3);
                var n = wi & 7;

                // int d = 0;
                for (int j = 0; j < height; j++)
                {
                    int e = n;
                    for (int i = 0; i < Math.Min(8 - n, width); i++)
                    {
                        var b = data[j * width * 4 + i * 4 + 2] != 0;
                        if (!b)
                            buf[index2 * height + j] |= (byte)((0x80) >> (e++));
                        else
                            buf[index2 * height + j] &= (byte)~((0x80) >> (e++));
                    }
                }
                for (int j = 0; j < height; j++)
                {
                    int e = 0;
                    for (int i = (8 - n); i < width; i++)
                    {
                        var b = data[j * width * 4 + i * 4 + 2] != 0;
                        if (!b)
                            buf[index2 * height + j + height] |= (byte)((0x80) >> (e++));
                        else
                            buf[index2 * height + j + height] &= (byte)~((0x80) >> (e++));
                    }
                }
            }
        }
        public static void Set3(nint rb1, nint rb2, int width, int height, BitmapImage bi)
        {
            int w2 = width / 8;
            byte* data = stackalloc byte[width * height * 4];
            bi.CopyPixels(new Int32Rect(0, 0, width, height), (nint)data, width * height * 4, width * 4);

            byte* array1 = rom + rb1;
            byte* array2 = rom + rb2;

            for (int j = 0; j < height; j++)
            {
                for (int i = 0; i < w2; i++)
                {
                    for (int k = 0; k < 8; k++)
                    {
                        var b = data[j * width * 4 + i * 8 * 4 + k * 4 + 0] >> 6;
                        if ((b & 0b10) == 0)
                            array2[j * w2 + i] |= (byte)(0x80 >> k);
                        else
                            array2[j * w2 + i] &= (byte)(~(0x80 >> k));
                        if ((b & 0b1) == 0)
                            array1[j * w2 + i] |= (byte)(0x80 >> k);
                        else
                            array1[j * w2 + i] &= (byte)(~(0x80 >> k));
                    }
                }
            }
        }
    }
}
