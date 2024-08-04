using Microsoft.Win32;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;
using static cw2tools.CasioInternal.Static;
using static cw2tools.CasioInternal.Strings;

namespace cw2tools
{
    /// <summary>
    /// LocalStrings.xaml 的交互逻辑
    /// </summary>
    public unsafe partial class LocalStrings : Window
    {
        public LocalStrings()
        {
            InitializeComponent();
        }

        private void Button_Click(object sender, RoutedEventArgs e)
        {
            LUT.Text = $"{LookupLangauge():X4}";
        }

        private void Button_Click_1(object sender, RoutedEventArgs e)
        {
            var lut = Convert.ToUInt32(LUT.Text, 16);
            var code = Convert.ToUInt32(LanguageCode.Text, 16);
            StringLut.Text = $"{((ushort*)(rom + lut))[code]:X4}";
        }
        private string DumpStringAsBytes(byte* data)
        {
            StringBuilder sb = new();
            while (true)
            {
                var b = *(data++);
                sb.Append(Convert.ToString(b, 16));
                sb.Append(' ');
                if (b == 0)
                    break;
            }
            return sb.ToString();
        }
        private void Button_Click_2(object sender, RoutedEventArgs e)
        {
            LoadCharacterMap();
            var table = (uint*)(rom + Convert.ToUInt32(StringLut.Text, 16));
            SaveFileDialog sfd = new();
            sfd.ShowDialog();
            using var fs = File.CreateText(sfd.FileName);
            fs.WriteLine("Index, Bytes , String");
            for (int i = 0; i < 0x2FC; i++)
            {
                if (strlen(rom + table[i]) == 114514)
                    break;
                fs.WriteLine($"{i},{DumpStringAsBytes(rom + table[i])},\"{strdup(rom + table[i])}\"");
            }
        }

        private void Button_Click_3(object sender, RoutedEventArgs e)
        {
            uint sb = Convert.ToUInt32(StringsBase.Text,16);
            OpenFileDialog sfd = new();
            sfd.ShowDialog();
            using var fs = File.OpenText(sfd.FileName);
            fs.ReadLine();
            uint ptr = sb;
            int count = 0;
            List<(uint, byte[])> FixPoints = new();
            var table = (uint*)(rom + Convert.ToUInt32(StringLut.Text, 16));
            while (!fs.EndOfStream)
            {
                var args = (fs.ReadLine() ?? "").Split(',');
                if (args.Length < 2)
                    continue;
                var i = Convert.ToInt32(args[0]);
                var bs = HexStringToByteArray(args[1]);
                if (bs.Length == 0 || bs[0] == 0)
                    continue;
                var p = rom + table[i];
                if (bs.Length <= (strlen(p) + 1)) // 包括末尾的0
                {
                    ApplyPatch(p, bs);
                }
                else
                {
                    count += bs.Length;
                    table[i] = ptr;
                    ApplyPatch(rom + ptr, bs);
                    ptr += (uint)bs.Length;
                }
            }
        }
    }
}
