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
    /// MenuEditWindow.xaml 的交互逻辑
    /// </summary>
    public unsafe partial class MenuEditWindow : Window
    {
        public MenuEditWindow()
        {
            InitializeComponent();
        }
        public TextBox InputKeyHex => KeyHex;
        public TextBox InputCondition => Condition;
        public TextBox InputTextHex => TextHex;
        public bool EditAccepted { get; private set; } = false;
        private void Button_Click(object sender, RoutedEventArgs e)
        {
            var str = FindStringInMemory(rom, 0x10000, Search.Text);
            if (str == null)
            {
                TextHex.Text = "???";
            }
            else
            {
                TextHex.Text = $"{(str - rom):X4}";
            }
        }
        private void Button2_Click(object sender, RoutedEventArgs e)
        {
            var str = (byte*)FindSignature(rom, 0x10000, Search2.Text);
            if (str == null)
            {
                TextHex.Text = "???";
            }
            else
            {
                TextHex.Text = $"{(str - rom):X4}";
            }
        }

        private void Button_Click_1(object sender, RoutedEventArgs e)
        {
            Close();
        }

        private void Button_Click_2(object sender, RoutedEventArgs e)
        {
            EditAccepted = true;
            Close();
        }
    }
}
