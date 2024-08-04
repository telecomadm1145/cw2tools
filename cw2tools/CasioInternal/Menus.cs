using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using static cw2tools.CasioInternal.Static;
using static cw2tools.CasioInternal.Strings;
namespace cw2tools.CasioInternal
{
    public unsafe class Item
    {
        public MenuItem* ptr { get; set; }
        public byte* text_ptr { get; set; }
        public ushort text_ptr2 { get; set; }
        public byte condition { get; set; }
        public string? text_local0 { get; set; }
        public string? text_local1 { get; set; }
        public ushort key { get; set; }
        public CMenu? parent { get; set; }
        public void UpdateLocal()
        {
            var offset = LookupLangauge();
            text_local0 = convert_local(rom, offset, text_ptr2, 0, false);
            text_local1 = convert_local(rom, offset, text_ptr2, 1, false);
        }
    }
    public unsafe class CMenu
    {
        public Item[]? Items { get; set; }
        public Menu* raw_ptr { get; set; }
        public ushort id { get; set; }
    }
    public struct Menu
    {
        public ushort pitems;
        public byte type;
        public byte item_count;
        public ushort parent_menu;
    }
    public struct MenuItem
    {
        public ushort ptext;
        public ushort op;
        public byte cond;
        public byte pad;
    }
    unsafe static class Menus
    {
        public static List<CMenu> GetMenus()
        {
            LoadCharacterMap();
            var offset = LookupLangauge();
            var show_menu = FindSignature(rom, 0x60000, "00 82 e9 90 9f ff 00 03 25 f0 06 e2 01".ToUpper());
            if (show_menu == 0)
                throw new Exception("Search failed");
            Debug.WriteLine($"Menu  func: 0x{show_menu - (nint)rom:X6}");
            show_menu += 0x10;
            var sm = (byte*)show_menu;
            var b = (sm[0] << 16 | sm[5] << 8 | sm[4]) - 3;
            Debug.WriteLine($"Menus: 0x{b:X6}");


            var ptr = (Menu*)(rom + b);
            List<CMenu> Menus = [];
            for (int i = 0; i < 255; i++, ptr++)
            {
                if (ptr->type > 3 || ptr->item_count > 30)
                    break;
                CMenu cm = new() { raw_ptr = ptr, id = (ushort)(0xEB00 | i) };
                List<Item> items = [];
                var ptr2 = (MenuItem*)(rom + ptr->pitems);
                for (int j = 0; j < ptr->item_count; j++)
                {
                    var v = (ptr2[j].op >> 8);
                    var fix_ = (v == 0xEE) || (v == 0xEB) || (v == 0xEC);
                    items.Add(new()
                    {
                        ptr = &ptr2[j],
                        text_ptr = rom + ptr2[j].ptext,
                        text_ptr2 = ptr2[j].ptext,
                        text_local0 = convert_local(rom, offset, ptr2[j].ptext, 0, fix_),
                        text_local1 = convert_local(rom, offset, ptr2[j].ptext, 1, fix_),
                        key = ptr2[j].op,
                        condition = ptr2[j].cond,
                        parent = cm,
                    });
                }
                cm.Items = [.. items];
                Menus.Add(cm);
            }
            Debug.WriteLine("Done!");

            return Menus;
        }
    }
}