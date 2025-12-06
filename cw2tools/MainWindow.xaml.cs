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
            // Load default view
            MainContent.Content = new TextBlock
            {
                Text = "欢迎使用 CW2 Tools\n请从左侧选择功能或打开 ROM",
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center,
                FontSize = 24,
                Foreground = (Brush)Application.Current.Resources["HeadingColor"]
            };
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
            MessageBox.Show("ROM 加载成功!");
        }

        private void SaveRom(object sender, RoutedEventArgs e)
        {
            if (rom == null) {
                 MessageBox.Show("请先打开 ROM");
                 return;
            }
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
             MessageBox.Show("ROM 保存成功!");
        }

        // Navigation Handlers
        private void Nav_Home(object sender, RoutedEventArgs e)
        {
             if (MainContent == null) return;
             MainContent.Content = new TextBlock
            {
                Text = "欢迎使用 CW2 Tools\n请从左侧选择功能或打开 ROM",
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center,
                FontSize = 24,
                Foreground = (Brush)Application.Current.Resources["HeadingColor"]
            };
        }

        private void Nav_MenuEditor(object sender, RoutedEventArgs e)
        {
             MainContent.Content = new MenuEditor();
        }

        private void Nav_FontEditor(object sender, RoutedEventArgs e)
        {
             MainContent.Content = new FontWindow();
        }

        private void Nav_MainMenuEditor(object sender, RoutedEventArgs e)
        {
             MainContent.Content = new MainMenuEditor();
        }

        private void Nav_StringEditor(object sender, RoutedEventArgs e)
        {
             MainContent.Content = new LocalStrings();
        }

        private void Nav_TokenEditor(object sender, RoutedEventArgs e)
        {
             MainContent.Content = new TokenEditor();
        }

        private void Nav_KbdEditor(object sender, RoutedEventArgs e)
        {
             MainContent.Content = new KbdEditor();
        }

        private void Nav_CodeInjector(object sender, RoutedEventArgs e)
        {
             MainContent.Content = new CodeInjector();
        }
    }
}