using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using static cw2tools.CasioInternal.Static;

namespace cw2tools.CasioInternal
{
    unsafe static class Strings
    {
        public static string strdup(byte* sb)
        {
            StringBuilder b = new();
            while (true)
            {
                var c = *sb;
                if (c == 0)
                    break;
                if (c >= 0xf0)
                {
                    var key = be_read(sb);
                    if (map.ContainsKey(key))
                        b.Append(map[key]);
                    else
                    {
                        b.Append($"<{key:X4}>");
                    }
                    sb += 2;
                }
                else
                {
                    var key = c;
                    if (map.ContainsKey(key))
                        b.Append(map[key]);
                    else
                    {
                        b.Append($"<{key:X4}>");
                    }
                    sb++;
                }
            }
            return b.ToString();
        }
        public static uint strlen(byte* sb)
        {
            uint count = 0;
            while (true)
            {
                if (sb < rom || sb > rom + 0x60000)
                    return 114514;
                if (count > 40)
                    return 114514;
                if (*sb > 0xf0)
                {
                    count += 2;
                    sb += 2;
                    continue;
                }
                if (*sb == 0)
                    break;
                count++;
                sb++;
            }
            return count;
        }
        public static string get_local_string(byte* rom, ushort offset, ushort code, byte language)
        {
            var ofst = *(uint*)(rom + code * 4 + ((ushort*)(rom + offset))[language]);
            if (ofst > 0x60000)
                return "";
            return strdup(rom + ofst);
        }
        public static string convert_local(byte* rom, ushort offset, ushort str, byte language, bool lookup_direct)
        {
            StringBuilder b = new();
            if (str <= 0x200 && lookup_direct)
            {
                return get_local_string(rom, offset, (ushort)(str - 1), language);
            }
            byte* sb = rom + str;
            while (true)
            {
                var c = *sb;
                if (c == 0)
                    break;
                if (c == 0x02)
                {
                    // b.Append($"{c:X2}:");
                    b.Append(get_local_string(rom, offset, (ushort)(sb[1] - 1), language));
                    sb += 2;
                }
                else if (c == 0x04)
                {
                    // b.Append($"{c:X2}:");
                    b.Append(get_local_string(rom, offset, (ushort)(sb[1] + 0xfe), language));
                    sb += 2;
                }
                else if (c == 0x05)
                {
                    // b.Append($"{c:X2}:");
                    b.Append(get_local_string(rom, offset, (ushort)(sb[1] + 0x1fd), language));
                    sb += 2;
                }
                else if (c >= 0xf0)
                {
                    var key = be_read(sb);
                    if (map.ContainsKey(key))
                        b.Append(map[key]);
                    else
                    {
                        b.Append($"<{key:X4}>");
                    }
                    sb += 2;
                }
                else
                {
                    var key = c;
                    if (map.ContainsKey(key))
                        b.Append(map[key]);
                    else
                    {
                        b.Append($"<{key:X4}>");
                    }
                    sb++;
                }
            }
            if (b.Length > 40)
                return "ERROR";
            return b.ToString();
        }
        public static Dictionary<int, string> map = [];
        public static unsafe void LoadCharacterMap()
        {
            if (map.Count > 0)
                return;

            JsonDocument jd;
            using (var fs = File.OpenRead("public_font_map_dist.json"))
                jd = JsonDocument.Parse(fs);
            var ey = jd.RootElement.GetProperty("EY");
            var un_00 = ey.GetProperty("UN_00");
            var un_f0 = ey.GetProperty("UN_F0");
            //var cy = jd.RootElement.GetProperty("CY");
            var cn_f1 = ey.GetProperty("CN_F1");
            var cn_f2 = ey.GetProperty("CN_F2");
            var sr_f3 = ey.GetProperty("SR_F3");
            var vn_f4 = ey.GetProperty("VN_F4");

            var tmp = un_00.GetProperty("inputMap");
            foreach (var obj in tmp.EnumerateObject())
            {
                var key = Convert.ToInt32(obj.Name, 16);
                var v = obj.Value.GetString();
                if (v != null)
                {
                    map.Add(key, v);
                }
            }
            tmp = un_f0.GetProperty("inputMap");
            foreach (var obj in tmp.EnumerateObject())
            {
                var key = Convert.ToInt32(obj.Name, 16);
                var v = obj.Value.GetString();
                if (v != null)
                {
                    map.Add(key, v);
                }
            }
            tmp = cn_f1.GetProperty("inputMap");
            foreach (var obj in tmp.EnumerateObject())
            {
                var key = Convert.ToInt32(obj.Name, 16);
                var v = obj.Value.GetString();
                if (v != null)
                {
                    map.Add(key, v);
                }
            }
            tmp = cn_f2.GetProperty("inputMap");
            foreach (var obj in tmp.EnumerateObject())
            {
                var key = Convert.ToInt32(obj.Name, 16);
                var v = obj.Value.GetString();
                if (v != null)
                {
                    map.Add(key, v);
                }
            }
            tmp = sr_f3.GetProperty("inputMap");
            foreach (var obj in tmp.EnumerateObject())
            {
                var key = Convert.ToInt32(obj.Name, 16);
                var v = obj.Value.GetString();
                if (v != null)
                {
                    map.Add(key, v);
                }
            }
            tmp = vn_f4.GetProperty("inputMap");
            foreach (var obj in tmp.EnumerateObject())
            {
                var key = Convert.ToInt32(obj.Name, 16);
                var v = obj.Value.GetString();
                if (v != null)
                {
                    map.Add(key, v);
                }
            }
            jd.Dispose();
        }
        public static unsafe ushort LookupLangauge()
        {
            var language = FindSignature(rom, 0x60000, "5e f8 5e f4 05 f8 10 90 bb 91 00 01 06 f0 85 f2 2b 93 2a 92 08 a0 ?? ?? 26 f0 08 a2 fc ff 08 90 fe ff 25 f4 00 82 45 f0 1e f4 1e f8 1f fe".ToUpper());
            if (language == 0)
            {
                throw new Exception("Search failed");
            }
            Debug.WriteLine($"Local func: 0x{language - (nint)rom:X6}");
            language += 0x16;
            var offset = *(ushort*)language;
            Debug.WriteLine($"Lang LUT: 0x{offset:X4}");
            return offset;
        }
    }
}
