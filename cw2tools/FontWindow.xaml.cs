using Microsoft.Win32;
using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Navigation;
using System.Windows.Shapes;
using Path = System.IO.Path;
using static cw2tools.CasioInternal.Static;

namespace cw2tools
{
    public unsafe partial class FontWindow : Window
    {
        public FontWindow()
        {
            InitializeComponent();

        }
        private nint ne_00;
        private nint ne_fx;
        private nint va_f1;
        private nint va_f2;
        private int index;
        private bool va_fix;
        private int font_type;

        bool[] BytesToBitSet(byte* bytes, nint length)
        {
            bool[] bitSet = new bool[length * 8];
            if (bytes + length >= rom + 0x80000)
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
        bool[] BytesToBitSetLE(byte* bytes, nint length)
        {
            bool[] bitSet = new bool[length * 8];
            if (bytes + length >= rom + 0x80000)
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
        private WriteableBitmap Get(nint bs, int index, int width, int height)
        {
            if (font_type == 0)
                return Clip(bs, index, width, height);
            else
                return Clip2(bs, index, width, height);
        }
        private new WriteableBitmap Clip(nint bs, int index, int width, int height)
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
        private WriteableBitmap Clip2(nint bs, int index, int width, int height)
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
        private void Set(nint bs, int index, int width, int height, BitmapSource src)
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

        private void Set2(nint bs, int index, int width, int height, BitmapSource src)
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
        private int LookupTable(int ind)
        {
            if (font_type != 0)
            {
                if (font_type == 2)
                    if (is_cwii)
                        return ((int*)(rom + ne_fx))[ind] & 0xffffff;
                    else
                        return ((ushort*)(rom + ne_fx))[ind];
                return (int)ne_00;
            }
            if (is_cwii)
            {
                return ((int*)(rom + ne_fx))[ind] & 0xffffff;
            }
            else
            {
                if (va_fix)
                {
                    if (ind == 0)
                    {
                        return (int)va_f1;
                    }
                    else if (ind == 1)
                    {
                        return (int)va_f2;
                    }
                    else
                    {
                        return (int)ne_00;
                    }
                }
                return ((ushort*)(rom + ne_fx))[ind];
            }
        }
        private BitmapSource LookupChar(int codepoint)
        {
            byte head = (byte)((codepoint & 0xff00) >> 8);
            byte ind = (byte)(((byte)codepoint) - 0x10);
            int w = 10;
            int h = 13;
            int w2 = 11;
            int h2 = 12;
            if (font_type != 0)
            {
                w = w2 = 5;
                if (font_type == 1)
                    h = h2 = 7;
                else
                    h = h2 = 9;
            }
            if (head >= 0xf0)
            {
                head -= 0xf0;
                var tbl = LookupTable(head);
                if (head == 1 || (head == 2 && !va_fix))
                    return Get(tbl, ind, w2, h2);
                return Get(tbl, ind, w, h);
            }
            else if (head != 0)
                throw new Exception("Codepoint is WRONG!");
            else
                return Get(ne_00, ind, w, h);
        }

        private void SetChar(int codepoint, BitmapSource src)
        {
            byte head = (byte)((codepoint & 0xff00) >> 8);
            byte ind = (byte)(((byte)codepoint) - 0x10);
            switch (font_type)
            {
                case 0:
                    {
                        if (head >= 0xf0)
                        {
                            head -= 0xf0;
                            var tbl = LookupTable(head);
                            if (head == 1 || (head == 2 && !va_fix))
                            {
                                Set(tbl, ind, 11, 12, src);
                            }
                            else
                                Set(tbl, ind, 10, 13, src);
                        }
                        else if (head != 0)
                        {
                            throw new Exception("Codepoint is WRONG!");
                        }
                        else
                        {
                            Set(ne_00, ind, 10, 13, src);
                        }
                        break;
                    }
                case 1:
                    {
                        Set2(ne_00, ind, 5, 7, src);
                        break;
                    }
                case 2:
                    {
                        if (head >= 0xf0)
                        {
                            head -= 0xf0;
                            var tbl = LookupTable(head);
                            Set2(tbl, ind, 5, 9, src);
                        }
                        else if (head != 0)
                        {
                            throw new Exception("Codepoint is WRONG!");
                        }
                        else
                        {
                            Set2(ne_00, ind, 5, 9, src);
                        }
                        break;
                    }
            }
        }

        private void Button_Click_1(object sender, RoutedEventArgs e)
        {
            if (rom == null)
            {
                throw new Exception("Open ROM FIRST!");
            }
            LoadSettings();
            PreviewImage.Source = LookupChar(index);
        }

        private void LoadSettings()
        {
            index = Convert.ToInt32(IndexInput.Text, 16);
            if (font_type == 0)
            {
                ne_00 = Convert.ToInt32(NE_00_Input.Text, 16);
                if (va_fix)
                {
                    va_f1 = Convert.ToInt32(VA_F0_Input.Text, 16);
                    va_f2 = Convert.ToInt32(VA_F1_Input.Text, 16);
                }
                else
                    ne_fx = Convert.ToInt32(NE_Fx_Input.Text, 16);
            }
            else if (font_type == 1)
            {
                ne_00 = Convert.ToInt32(L8_00_Input.Text, 16);
                va_fix = false;
            }
            else
            {
                ne_00 = Convert.ToInt32(LA_00_Input.Text, 16);
                ne_fx = Convert.ToInt32(LA_Fx_Input.Text, 16);
                va_fix = false;
            }
        }

        private void Button_Click_5(object sender, RoutedEventArgs e)
        {
            SaveFileDialog sfd = new();
            sfd.ShowDialog();
            var fs = sfd.OpenFile();
            fs.Write(new ReadOnlySpan<byte>(rom, 0x80000));
            fs.Write(new ReadOnlySpan<byte>(rom, 0x80000));
            fs.Close();
        }
        private void SaveImage(BitmapSource bmp, Stream s)
        {
            try
            {
                // 创建 PngBitmapEncoder 并设置编码属性
                PngBitmapEncoder encoder = new PngBitmapEncoder();
                encoder.Frames.Add(BitmapFrame.Create(bmp));
                encoder.Save(s);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"错误: \n{ex}");
            }
        }
        private void Button_Click_7(object sender, RoutedEventArgs e)
        {
            LoadSettings();
            OpenFileDialog ofd = new();
            ofd.ShowDialog();
            var stm = ofd.OpenFile();
            BitmapImage bi = new();
            bi.BeginInit();
            bi.StreamSource = stm;
            bi.EndInit();
            SetChar(index, bi);
            return;
        }
        private void Button_Click_8(object sender, RoutedEventArgs e)
        {
            LoadSettings();
            Directory.CreateDirectory("00");
            switch (font_type)
            {
                case 0:
                    if (va_fix)
                        for (int i = 0; i < 2; i++)
                            Directory.CreateDirectory($"F{i:X1}");
                    else
                        for (int i = 0; i < 0xf; i++)
                            Directory.CreateDirectory($"F{i:X1}");
                    for (int i = 0; i < 0xff; i++)
                        using (var fs = File.OpenWrite($"00/{(byte)(i + 0x10):X2}.png"))
                            SaveImage(Get(ne_00, i, 10, 13), fs);
                    if (va_fix)
                        for (int j = 0; j < 2; j++)
                            for (int i = 0; i < 0xff; i++)
                                using (var fs = File.OpenWrite($"F{j:X1}/{(byte)(i + 0x10):X2}.png"))
                                    if (j == 1)
                                        SaveImage(Get(LookupTable(j), i, 11, 12), fs);
                                    else
                                        SaveImage(Get(LookupTable(j), i, 10, 13), fs);
                    else
                        for (int j = 0; j < 0xf; j++)
                            for (int i = 0; i < 0xff; i++)
                                using (var fs = File.OpenWrite($"F{j:X1}/{(byte)(i + 0x10):X2}.png"))
                                    if (j == 1 || j == 2)
                                        SaveImage(Get(LookupTable(j), i, 11, 12), fs);
                                    else
                                        SaveImage(Get(LookupTable(j), i, 10, 13), fs);
                    break;
                case 1:
                    for (int i = 0; i < 0xff; i++)
                        using (var fs = File.OpenWrite($"00/{(byte)(i + 0x10):X2}.png"))
                            SaveImage(Get(ne_00, i, 5, 7), fs);
                    break;
                case 2:
                    for (int i = 0; i < 0xf; i++)
                        Directory.CreateDirectory($"F{i:X1}");
                    for (int i = 0; i < 0xff; i++)
                        using (var fs = File.OpenWrite($"00/{(byte)(i + 0x10):X2}.png"))
                            SaveImage(Get(ne_00, i, 5, 9), fs);
                    for (int j = 0; j < 0xf; j++)
                        for (int i = 0; i < 0xff; i++)
                            using (var fs = File.OpenWrite($"F{j:X1}/{(byte)(i + 0x10):X2}.png"))
                                SaveImage(Get(LookupTable(j), i, 5, 9), fs);
                    break;
            }
        }


        private void Button_Click_11(object sender, RoutedEventArgs e)
        {
            NE_00_Input.Text = NE_Fx_Input.Text = L8_00_Input.Text = VA_F0_Input.Text = VA_F1_Input.Text = LA_00_Input.Text = LA_Fx_Input.Text = "????";
            if (is_cwii)
            {
                switch (font_type)
                {
                    case 0:
                        {
                            var r = (byte*)FindSignature(rom, 0x60000, "00 ?? 01 ?? 02 f2 b0 f4 d2 7c 78 02 c9");
                            Debug.Print($"{r - rom:X4}\n");
                            if (r != null)
                            {
                                r -= 1;
                                var code = r[0] | r[2] << 8 | r[4] << 16;
                                NE_00_Input.Text = code.ToString("X4");
                            }
                            r = (byte*)FindSignature(rom, 0x60000, "00 01 0f 20 00 21 2b 91 2a 90 08 a2 ?? ?? 08 90 ?? ?? f2 b2 f4 d0");
                            Debug.Print($"{r - rom:X4}\n");
                            if (r == null)
                                return;
                            r -= 2;
                            if (*(ushort*)(r + 0xE) != *(ushort*)(r + 0x12) - 2)
                                return;
                            NE_Fx_Input.Text = (*(ushort*)(r + 0xE)).ToString("X4");
                            break;
                        }
                    case 1:
                        {
                            var r = (byte*)FindSignature(rom, 0x60000, "05 fc f4 d2 16 ce 09 00 ff d0 90 80");
                            Debug.Print($"{r - rom:X4}\n");
                            if (r != null)
                            {
                                r -= 1;
                                var code = r[-5] | r[-3] << 8 | r[-1] << 16;
                                L8_00_Input.Text = code.ToString("X4");
                            }
                            break;
                        }
                    case 2:
                        {
                            var r = (byte*)FindSignature(rom, 0x60000, "05 fc f4 d2 00 74 14 c8 7e d0 7c 70");
                            Debug.Print($"{r - rom:X4}\n");
                            if (r != null)
                            {
                                r -= 1;
                                var code = r[-5] | r[-3] << 8 | r[-1] << 16;
                                LA_00_Input.Text = code.ToString("X4");
                            }
                            r = (byte*)FindSignature(rom, 0x60000, "00 01 0f 20 00 21 2b 91 2a 90 08 a2");
                            if (r != null)
                            {
                                if (*(ushort*)(r + 0xC) != *(ushort*)(r + 0x10) - 2)
                                    return;
                                LA_Fx_Input.Text = (*(ushort*)(r + 0xC)).ToString("X4");
                            }
                            break;
                        }
                }
            }
            else
            {
                switch (font_type)
                {
                    case 0:
                        {
                            var r = (byte*)FindSignature(rom, 0x40000, "07 81 92 c3 ea a1 3e f8 2e f4 8e f2");
                            Debug.Print($"{r - rom:X4}\n");
                            if (r != null)
                            {
                                var code = r[-4] | r[-2] << 8;
                                NE_00_Input.Text = code.ToString("X4");
                            }
                            r = (byte*)FindSignature(rom, 0x40000, "21 80 00 61 02 90 0a f0 2e f0");
                            Debug.Print($"{r - rom:X4}\n");
                            if (r != null)
                            {
                                var code = r[-4] | r[-2] << 8;
                                NE_Fx_Input.Text = code.ToString("X4");
                            }
                            else
                            {
                                r = (byte*)FindSignature(rom, 0x40000, "0c 08 5e f2 5e f4 00 7c 0a c8 7c 70");
                                Debug.Print($"{r - rom:X4}\n");
                                if (r != null)
                                {
                                    VA_F0_Input.Text = (*(ushort*)(r - 10)).ToString("X4");
                                    VA_F1_Input.Text = (*(ushort*)(r - 2)).ToString("X4");
                                    SetVAFix(true);
                                    return;
                                }
                            }
                        }
                        break;
                    case 1:
                        {
                            var r = (byte*)FindSignature(rom, 0x40000, "07 08 00 ce 5e f2 5e f4 00 79 09 c8 7c");
                            Debug.Print($"{r - rom:X4}\n");
                            if (r != null)
                            {
                                L8_00_Input.Text = (*(ushort*)&r[-2]).ToString("X4");
                            }
                            break;
                        }
                    case 2:
                        {
                            var r = (byte*)FindSignature(rom, 0x40000, "00 79 0b c9 6e f0 90 82 0f 22 1a 92");
                            Debug.Print($"{r - rom:X4}\n");
                            if (r != null)
                            {
                                LA_00_Input.Text = (*(ushort*)&r[-2]).ToString("X4");
                                var code = r[0xC] | r[0xE] << 8;
                                LA_Fx_Input.Text = code.ToString("X4");
                            }
                            break;
                        }
                }
            }
        }


        private void ABFix_Checked(object sender, RoutedEventArgs e)
        {
            var val = ABFix.IsChecked ?? false;
            SetVAFix(val);
        }

        private void SetVAFix(bool val)
        {
            ABFix.IsChecked = val;
            va_fix = val;
            if (va_fix)
            {
                VAFixEn.Visibility = Visibility.Visible;
                VAFixDis.Visibility = Visibility.Collapsed;
            }
            else
            {
                VAFixDis.Visibility = Visibility.Visible;
                VAFixEn.Visibility = Visibility.Collapsed;
            }
        }
        private void RadioButton_Checked(object sender, RoutedEventArgs e)
        {
            font_type = int.Parse(((RadioButton)sender).Tag.ToString());
        }

        private void Button_Click_2(object sender, RoutedEventArgs e)
        {
            LoadSettings();
            if (PreviewImage.Source == null)
            {
                MessageBox.Show("Load first!");
                return;
            }
            SaveFileDialog sfd = new();
            sfd.ShowDialog();
            var fs = sfd.OpenFile();
            SaveImage((BitmapSource?)PreviewImage.Source, fs);
            fs.Close();
        }
        private BitmapImage LoadBitmap(Stream s)
        {
            BitmapImage bi = new();
            bi.BeginInit();
            bi.StreamSource = s;
            bi.EndInit();
            bi.Freeze();
            return bi;
        }
        private void Button_Click_3(object sender, RoutedEventArgs e)
        {
            LoadSettings();
            switch (font_type)
            {
                case 0:
                    for (int i = 0; i < 0xff; i++)
                        if (Path.Exists($"00/{(byte)(i + 0x10):X2}.png"))
                            using (var fs = File.OpenRead($"00/{(byte)(i + 0x10):X2}.png"))
                                Set(ne_00, i, 10, 13, LoadBitmap(fs));
                    if (va_fix)
                    {
                        for (int j = 0; j < 2; j++)
                            for (int i = 0; i < 0xff; i++)
                                if (Path.Exists($"F{j:X1}/{(byte)(i + 0x10):X2}.png"))
                                    using (var fs = File.OpenRead($"F{j:X1}/{(byte)(i + 0x10):X2}.png"))
                                        if (j == 1)
                                            Set(LookupTable(j), i, 11, 12, LoadBitmap(fs));
                                        else
                                            Set(LookupTable(j), i, 10, 13, LoadBitmap(fs));
                    }
                    else
                    {
                        for (int j = 0; j < 0xf; j++)
                            for (int i = 0; i < 0xff; i++)
                                if (Path.Exists($"F{j:X1}/{(byte)(i + 0x10):X2}.png"))
                                    using (var fs = File.OpenRead($"F{j:X1}/{(byte)(i + 0x10):X2}.png"))
                                        if (j == 1 || j == 2)
                                            Set(LookupTable(j), i, 11, 12, LoadBitmap(fs));
                                        else
                                            Set(LookupTable(j), i, 10, 13, LoadBitmap(fs));
                    }
                    break;
                case 1:
                    for (int i = 0; i < 0xff; i++)
                        if (Path.Exists($"00/{(byte)(i + 0x10):X2}.png"))
                            using (var fs = File.OpenRead($"00/{(byte)(i + 0x10):X2}.png"))
                                Set2(ne_00, i, 5, 7, LoadBitmap(fs));
                    break;
                case 2:
                    for (int i = 0; i < 0xff; i++)
                        if (Path.Exists($"00/{(byte)(i + 0x10):X2}.png"))
                            using (var fs = File.OpenRead($"00/{(byte)(i + 0x10):X2}.png"))
                                Set2(ne_00, i, 5, 9, LoadBitmap(fs));
                    for (int j = 0; j < 0xf; j++)
                        for (int i = 0; i < 0xff; i++)
                            if (Path.Exists($"F{j:X1}/{(byte)(i + 0x10):X2}.png"))
                                using (var fs = File.OpenRead($"F{j:X1}/{(byte)(i + 0x10):X2}.png"))
                                    Set2(LookupTable(j), i, 5, 9, LoadBitmap(fs));
                    break;
            }
        }
    }
}