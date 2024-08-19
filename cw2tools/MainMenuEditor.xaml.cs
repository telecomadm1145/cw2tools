using Microsoft.Win32;
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
using static cw2tools.CasioInternal.Static;

namespace cw2tools
{
    public unsafe partial class MainMenuEditor : Window
    {
        public MainMenuEditor()
        {
            InitializeComponent();

        }
        private nint mb1;
        private nint mb2;
        private int language;
        private int index;
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
        private ImageSource ComposeImage()
        {
            WriteableBitmap b = new(64, 29, 96, 96, PixelFormats.Bgr32, null);
            b.Lock();
            byte* buf = (byte*)b.BackBuffer;
            // render icon
            {
                nint rb1 = *(int*)(rom + mb1 + index * 8) & 0xffffff;
                nint rb2 = *(int*)(rom + mb1 + index * 8 + 4) & 0xffffff;
                var array1 = BytesToBitSet(rom + rb1, 17 * 8);
                var array2 = BytesToBitSet(rom + rb2, 17 * 8);
                byte[] fin = array1.Zip(array2, (a, b) => (byte)((b ? 2 : 0) + (a ? 1 : 0))).ToArray();
                int d = 0;
                for (int j = 0; j <= 16; j++)
                {
                    for (int i = 0; i < 64; i++)
                    {
                        buf[j * b.BackBufferStride + i * 4] = (byte)(255 - fin[d] * 85);
                        buf[j * b.BackBufferStride + i * 4 + 1] = (byte)(255 - fin[d] * 85);
                        buf[j * b.BackBufferStride + i * 4 + 2] = (byte)(255 - fin[d++] * 85);
                    }
                }
            }

            // render text
            {
                nint rb1 = *(int*)(rom + mb2 + index * 4 + language * 0x3c) & 0xffffff;
                var array1 = BytesToBitSet(rom + rb1, 2 * 64);
                int d = 0;
                for (int j = 16; j < 29; j++)
                {
                    for (int i = 0; i < 64; i++)
                    {
                        buf[j * b.BackBufferStride + i * 4] = (byte)(!array1[d] ? 255 : 0);
                        buf[j * b.BackBufferStride + i * 4 + 1] = (byte)(!array1[d] ? 255 : 0);
                        buf[j * b.BackBufferStride + i * 4 + 2] = (byte)(!array1[d++] ? 255 : 0);
                    }
                }

            }
            b.AddDirtyRect(new Int32Rect(0, 0, 64, 29));
            b.Unlock();
            return b;
        }
        // Load Rom
        private void Button_Click(object sender, RoutedEventArgs e)
        {
            OpenFileDialog ofd = new();
            ofd.ShowDialog();
            var stm = ofd.OpenFile();
            if (rom != null)
                Marshal.FreeHGlobal((nint)rom);
            rom = (byte*)Marshal.AllocHGlobal(0x80000);
            stm.Read(new Span<byte>(rom, 0x80000));
            stm.Close();
        }

        private void Button_Click_1(object sender, RoutedEventArgs e)
        {
            mb1 = Convert.ToInt32(MenuBase1Input.Text, 16);
            mb2 = Convert.ToInt32(MenuBase2Input.Text, 16);
            language = Convert.ToInt32(LanguageInput.Text, 16);
            index = Convert.ToInt32(IndexInput.Text, 16);
            PreviewImage.Source = ComposeImage();
            ModeInput.Text = Convert.ToString(*(rom + mb1 + index * 8 + 7), 16);
            BitmapOffset0.Text = Convert.ToString(*(uint*)(rom + mb1 + index * 8) & 0xffffffu, 16);
            BitmapOffset1.Text = Convert.ToString(*(uint*)(rom + mb1 + index * 8 + 4) & 0xffffffu, 16);
            BitmapOffset2.Text = Convert.ToString(*(uint*)(rom + mb2 + index * 4 + language * 0x3c) & 0xffffffu, 16);
        }
        private void Button_Click_2(object sender, RoutedEventArgs e)
        {
            *(rom + mb1 + index * 8 + 7) = Convert.ToByte(ModeInput.Text, 16);
        }
        // BitmapOffset1
        private void Button_Click_3(object sender, RoutedEventArgs e)
        {
            *(uint*)(rom + mb1 + index * 8 + 4) = (Convert.ToUInt32(BitmapOffset1.Text, 16) & 0xffffffu) | (*(uint*)(rom + mb1 + index * 8 + 4) & 0xff000000u);
        }
        // BitmapOffset0
        private void Button_Click_4(object sender, RoutedEventArgs e)
        {
            *(uint*)(rom + mb1 + index * 8) = (Convert.ToUInt32(BitmapOffset0.Text, 16) & 0xffffffu) | (*(uint*)(rom + mb1 + index * 8) & 0xff000000u);
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

        private void Button_Click_6(object sender, RoutedEventArgs e)
        {
            *(uint*)(rom + mb2 + index * 4 + language * 0x3c) = (Convert.ToUInt32(BitmapOffset2.Text, 16) & 0xffffffu) | (*(uint*)(rom + mb2 + index * 4 + language * 0x3c) & 0xff000000u);
        }
        private void SaveImage(BitmapSource bmp, Stream s)
        {
            try
            {
                // 创建 PngBitmapEncoder 并设置编码属性
                PngBitmapEncoder encoder = new PngBitmapEncoder();
                encoder.Frames.Add(BitmapFrame.Create(bmp));
                encoder.Save(s);

                MessageBox.Show("Saved!");
            }
            catch (Exception ex)
            {
                MessageBox.Show($"ERROR: \n{ex}");
            }
        }
        private void Button_Click_7(object sender, RoutedEventArgs e)
        {
            OpenFileDialog ofd = new();
            ofd.ShowDialog();
            var stm = ofd.OpenFile();
            BitmapImage bi = new();
            bi.BeginInit();
            bi.StreamSource = stm;
            bi.EndInit();
            if (bi.PixelWidth < 64 || bi.PixelHeight < 16)
            {
                MessageBox.Show("Size incorrect.");
                return;
            }
            SetIcon(bi, new Int32Rect(0, 0, 64, 16));
            stm.Close();
        }

        private void SetIcon(BitmapImage bi, Int32Rect range)
        {
            byte* data = stackalloc byte[64 * 16 * 4];
            bi.CopyPixels(range, (nint)data, 64 * 16 * 4, 64 * 4);
            nint rb1 = *(int*)(rom + mb1 + index * 8) & 0xffffff;
            nint rb2 = *(int*)(rom + mb1 + index * 8 + 4) & 0xffffff;

            byte* array1 = rom + rb1;
            byte* array2 = rom + rb2;
            for (int i = 0; i < 8 * 16; i++)
            {
                array1[i] = 0;
                array2[i] = 0;
            }
            //byte[] fin = array1.Zip(array2, (a, b) => (byte)((b ? 2 : 0) + (a ? 1 : 0))).ToArray();
            for (int j = 0; j < 16; j++)
            {
                for (int i = 0; i < 8; i++)
                {
                    for (int k = 0; k < 8; k++)
                    {
                        var b =
                            data[j * 64 * 4 + i * 8 * 4 + k * 4 + 2] >> 6;
                        array2[j * 8 + i] |= (b & 0b10) == 0 ? (byte)(0x80 >> k) : (byte)0;
                        array1[j * 8 + i] |= (b & 0b1) == 0 ? (byte)(0x80 >> k) : (byte)0;
                    }
                }
            }
        }
        private void SetLabel(BitmapImage bi, Int32Rect range)
        {
            byte* data = stackalloc byte[64 * 16 * 4];
            bi.CopyPixels(range, (nint)data, 64 * 16 * 4, 64 * 4);
            nint rb1 = *(int*)(rom + mb2 + index * 4 + language * 0x3c) & 0xffffff;

            byte* array1 = rom + rb1;
            for (int i = 0; i < 13 * 8; i++)
            {
                array1[i] = 0;
            }
            for (int j = 0; j < 13; j++)
            {
                for (int i = 0; i < 8; i++)
                {
                    for (int k = 0; k < 8; k++)
                    {
                        var b = data[j * 64 * 4 + i * 8 * 4 + k * 4 + 2] >> 7;
                        array1[j * 8 + i] |= (b & 0b1) == 0 ? (byte)(0x80 >> k) : (byte)0;
                    }
                }
            }
        }
        private void Button_Click_8(object sender, RoutedEventArgs e)
        {
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

        private void Button_Click_9(object sender, RoutedEventArgs e)
        {
            OpenFileDialog ofd = new();
            ofd.ShowDialog();
            var stm = ofd.OpenFile();
            BitmapImage bi = new();
            bi.BeginInit();
            bi.StreamSource = stm;
            bi.EndInit();
            if (bi.PixelWidth < 64 || bi.PixelHeight < 13)
            {
                MessageBox.Show("Size incorrect.");
                return;
            }
            SetLabel(bi, new Int32Rect(0, 0, 64, 13));
            stm.Close();
        }

        private void Button_Click_10(object sender, RoutedEventArgs e)
        {
            OpenFileDialog ofd = new();
            ofd.ShowDialog();
            var stm = ofd.OpenFile();
            BitmapImage bi = new();
            bi.BeginInit();
            bi.StreamSource = stm;
            bi.EndInit();
            if (bi.PixelWidth < 64 || bi.PixelHeight < 29)
            {
                MessageBox.Show("Size incorrect.");
                return;
            }
            SetIcon(bi, new Int32Rect(0, 0, 64, 16));
            SetLabel(bi, new Int32Rect(0, 16, 64, 13));
            stm.Close();
        }
        private nint icon_cnt = 0;
        private Dictionary<int, nint> main_subs = new();
        private void Button_Click_11(object sender, RoutedEventArgs e)
        {
            var count_addr = (byte*)FindSignature(rom, 0x5e000, "81 e6 10 90 ?? ?? 00 01 07 f6 11 c6 7e b0 81 e0");
            var cnt = rom[*(ushort*)&count_addr[4]];
            icon_cnt = *(ushort*)&count_addr[4];
            IconCountTip.Text = $"{*(ushort*)&count_addr[4]:X4}";
            IconCountInput.Text = cnt.ToString();
            var sig1 = FindSignature(rom, 0xffff, "00 ?? ?? ?? C1 ?? ?? ?? 00 ?? ?? ?? 03") - 3;
            var firstmatch = Convert.ToString(sig1 - (nint)rom, 16).PadLeft(4, '0').ToUpper();
            MenuBase1Input.Text = firstmatch;
            var sig2 = FindSignature(rom, 0x60000, $"f8 b2 08 a2 {firstmatch[2..4]} {firstmatch[0..2]} 08 90") - (nint)rom;
            var v2 = *(ushort*)&rom[sig2 + 0xa4];
            var match2 = Convert.ToString(v2, 16).PadLeft(4, '0').ToUpper();
            MenuBase2Input.Text = match2;
            var main = (byte*)FindSignature(rom, 0x5e000, $"10 90 58 f0 00 84 01 ?? ?? ?? 40 00 06 01 01 f0");
            var main_sub = (byte*)FindSignature(main, 0x200, "10 90 a1 91 ?? 70 ?? c9") + 4;
            main_subs.Clear();
            while (main_sub[1] == 0x70 && main_sub[3] == 0xc9)
            {
                var bl = &main_sub[4 + (int)((sbyte)main_sub[2]) * 2];
                if (bl[0] != 1 && (bl[1] & 0xf0) != 0xf0)
                {
                    // ??? idk what happened
                    break;
                }
                var code = ((bl[1] & 0xf) << 16) | (bl[2]) | (bl[3] << 8);
                main_subs.Add(main_sub[0], code);
                main_sub += 4;
            }
            if (main_sub[0] == 1 && (main_sub[1] & 0xf0) == 0xf0)
            {
                var code = ((main_sub[1] & 0xf) << 16) | (main_sub[2]) | (main_sub[3] << 8);
                main_subs.Add(0xc1, code);
            }
        }

        private void Button_Click_12(object sender, RoutedEventArgs e)
        {
            rom[icon_cnt] = byte.Parse(IconCountInput.Text);
        }

        private void Button_Click_13(object sender, RoutedEventArgs e)
        {

        }
    }
}