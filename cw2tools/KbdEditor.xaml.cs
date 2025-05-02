using System;
using System.Collections.Generic;
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
namespace cw2tools
{
    /// <summary>
    /// KbdEditor.xaml 的交互逻辑
    /// </summary>
    public unsafe partial class KbdEditor : Window
    {
        public KbdEditor()
        {
            InitializeComponent();
        }
        string BL(nint func)
        {
            return $"01 F{(func >> 16) & 0xf:X} {func & 0xff:X2} {(func >> 8) & 0xff:X2}";
        }
        string B(nint func)
        {
            return $"00 F{(func >> 16) & 0xf:X} {func & 0xff:X2} {(func >> 8) & 0xff:X2}";
        }
        private void Button_Click(object sender, RoutedEventArgs e)
        {
            var lookup_key =
                (byte*)FindSignature(rom, 0x60000, "6e f8 05 f8 25 fa 00 90 00 82 88 90 01 00 00 83 00 70 02 c9 00 72 02 c8 00 e0 18 ce 00 01 02 ce 01 11 1c 92 00 72 fc c2 10 82 00 01 02 ce 01 11 1c 93 00 73 fc c2 10 80 ff 10 00 83 ff 12 20 80") - rom;
            var lookup_key_caller_cw2 =
                FindSignature(rom, 0x60000, $"""
                b1 a0 a0 91 07 c9 ?? 02 ?? 03 e5 f0 ?? e0
                {BL((nint)lookup_key)}
                06 ce ?? 02 ?? 03 e5 f0 ?? e0
                {BL((nint)lookup_key)}
                """.ToLower());

        }
    }
}
