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
    public unsafe partial class MenuEditor : Window
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
            mew.InputKeyHex.Text = $"{tg.key:X2}";
            mew.InputCondition.Text = $"{tg.condition:X2}";
            mew.InputTextHex.Text = $"{tg.text_ptr2:X4}";
            mew.ShowDialog();
            if (mew.EditAccepted)
            {
                tg.condition = tg.ptr->cond = Convert.ToByte(mew.InputCondition.Text, 16);
                tg.key = tg.ptr->op = Convert.ToUInt16(mew.InputKeyHex.Text, 16);
                tg.text_ptr2 = tg.ptr->ptext = Convert.ToUInt16(mew.InputTextHex.Text, 16);
                tg.UpdateLocal();
            }
        }
    }
}
