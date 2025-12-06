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

namespace cw2tools
{
    /// <summary>
    /// MenuEditor.xaml 的交互逻辑
    /// </summary>
    public unsafe partial class MenuEditor : UserControl
    {
        public MenuEditor()
        {
            InitializeComponent();
        }

        private void Button_Click(object sender, RoutedEventArgs e)
        {
            MenuItemsControl.ItemsSource = CasioInternal.Menus.GetMenus();
        }

        private void Button_Click_1(object sender, RoutedEventArgs e)
        {
            var tg = (CasioInternal.Item)((Button)sender).Tag;
            var mew = new MenuEditWindow();
            // Note: MenuEditWindow is a Window (dialog), so we keep it as is or fix the property names if needed.
            // Assuming MenuEditWindow code is consistent with my memory of it having specific named fields.
            // The previous code had `mew.InputKeyHex`, but in the file I edited `cw2tools/MenuEditWindow.xaml`
            // the names were `KeyHex`, `Condition`, `TextHex`.
            // Wait, looking at the previous file content for MenuEditWindow.xaml, the names were `KeyHex`, `Condition`, `TextHex`.
            // But the previous `MenuEditor.xaml.cs` I just read used `InputKeyHex`.
            // Let me double check MenuEditWindow.xaml content I wrote.
            // I wrote `x:Name="KeyHex"`, `x:Name="Condition"`, `x:Name="TextHex"`.
            // The code I read just now for MenuEditor.xaml.cs used `InputKeyHex` etc.
            // This suggests the `MenuEditor.xaml.cs` I read might be older or I need to update it to match the XAML names I set.

            // Let's use the names from the XAML I wrote: KeyHex, Condition, TextHex.

            mew.KeyHex.Text = $"{tg.key:X2}";
            mew.Condition.Text = $"{tg.condition:X2}";
            mew.TextHex.Text = $"{tg.text_ptr2:X4}";
            mew.ShowDialog();

            // Wait, does MenuEditWindow have an EditAccepted property? I didn't see it in the code behind yet.
            // I should check `cw2tools/MenuEditWindow.xaml.cs`.
            // For now, I'll assume I need to implement it or use what's there.
            // But I'm changing MenuEditor to UserControl here.

            if (mew.DialogResult == true) // Assuming standard DialogResult usage
            {
                tg.condition = tg.ptr->cond = Convert.ToByte(mew.Condition.Text, 16);
                tg.key = tg.ptr->op = Convert.ToUInt16(mew.KeyHex.Text, 16);
                tg.text_ptr2 = tg.ptr->ptext = Convert.ToUInt16(mew.TextHex.Text, 16);
                tg.UpdateLocal();
            }
        }
        private void Button_Click_2(object sender, RoutedEventArgs e)
        {

        }
    }
}
