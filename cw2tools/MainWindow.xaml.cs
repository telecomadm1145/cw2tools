using Microsoft.Win32;
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
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public unsafe partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
        }

        private void Button_Click(object sender, RoutedEventArgs e)
        {
            new MenuEditor().Show();
        }
        private void OpenRom(object sender, RoutedEventArgs e)
        {
            OpenFileDialog ofd = new();
            ofd.ShowDialog();
            var stm = ofd.OpenFile();
            if (rom != null)
                Marshal.FreeHGlobal((nint)rom);
            rom = (byte*)Marshal.AllocHGlobal(0x80000);
            is_cwii = stm.Length > 0x40000;
            stm.Read(new Span<byte>(rom, 0x80000));
            stm.Close();
        }
        private void SaveRom(object sender, RoutedEventArgs e)
        {
            SaveFileDialog sfd = new();
            sfd.ShowDialog();
            var fs = sfd.OpenFile();
            if (is_cwii)
            {
                fs.Write(new ReadOnlySpan<byte>(rom, 0x80000));
                fs.Write(new ReadOnlySpan<byte>(rom, 0x80000));
            }
            else
            {
                fs.Write(new ReadOnlySpan<byte>(rom, 0x40000));
            }
            fs.Close();
        }

        private void Button_Click_1(object sender, RoutedEventArgs e)
        {
            new FontWindow().Show();
        }

        private void Button_Click_2(object sender, RoutedEventArgs e)
        {
            new MainMenuEditor().Show();
        }

        private void Button_Click_3(object sender, RoutedEventArgs e)
        {
            new LocalStrings().Show();
        }
    }
}