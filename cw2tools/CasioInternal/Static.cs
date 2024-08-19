using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;

namespace cw2tools.CasioInternal
{
    public static unsafe class Static
    {
        public static byte* rom;
        public static bool is_cwii;
        public static ushort be_read(byte* ptr)
        {
            return (ushort)((ptr[0] << 8) | ptr[1]);
        }
        public static byte GetByte(byte* pattern)
        {
            if (*pattern == '?')
                return 0;

            byte high = (byte)(pattern[0] >= '0' && pattern[0] <= '9' ? pattern[0] - '0' : pattern[0] - 'A' + 10);
            byte low = (byte)(pattern[1] >= '0' && pattern[1] <= '9' ? pattern[1] - '0' : pattern[1] - 'A' + 10);

            return (byte)((high << 4) | low);
        }
        public static IntPtr FindSignature(byte* start, nint size, string signature)
        {
            signature = signature.ToUpper();
            byte* pattern = (byte*)Marshal.StringToHGlobalAnsi(signature).ToPointer();
            byte* oldPat = pattern;
            byte* end = start + size;
            IntPtr firstMatch = IntPtr.Zero;

            byte patByte = GetByte(pattern);

            for (byte* pCur = start; pCur < end; pCur++)
            {
                if (*pattern == 0)
                    return firstMatch;

                while (*pattern == ' ')
                    pattern++;

                if (*pattern == 0)
                    return firstMatch;

                if (oldPat != pattern)
                {
                    oldPat = pattern;
                    if (*pattern != '?')
                        patByte = GetByte(pattern);
                }

                if (*pattern == '?' || *pCur == patByte)
                {
                    if (firstMatch == IntPtr.Zero)
                        firstMatch = (IntPtr)pCur;

                    if (pattern[1] == 0 || pattern[2] == 0)
                        return firstMatch;

                    pattern += 2;
                }
                else
                {
                    pattern = (byte*)Marshal.StringToHGlobalAnsi(signature).ToPointer();
                    firstMatch = IntPtr.Zero;
                }
            }

            return IntPtr.Zero;
        }
        public static byte* FindStringInMemory(byte* memory, nint length, string str)
        {
            if (memory == null || length <= 0 || string.IsNullOrEmpty(str))
            {
                throw new ArgumentException("Invalid arguments provided.");
            }

            byte[] searchBytes = Encoding.UTF8.GetBytes(str);
            fixed (byte* searchPtr = searchBytes)
            {
                for (nint i = 0; i <= length - searchBytes.Length; i++)
                {
                    if (CompareBytes(memory + i, searchPtr, searchBytes.Length))
                    {
                        return memory + i;
                    }
                }
            }

            return null;
        }

        private static bool CompareBytes(byte* memory, byte* search, int length)
        {
            for (int i = 0; i < length; i++)
            {
                if (memory[i] != search[i])
                {
                    return false;
                }
            }

            return memory[length] == 0;
        }
        public static byte[] HexStringToByteArray(string hexString)
        {
            // 按空格分隔字符串
            string[] hexValues = hexString.Split(' ', StringSplitOptions.RemoveEmptyEntries);

            byte[] byteArray = new byte[hexValues.Length];

            for (int i = 0; i < hexValues.Length; i++)
            {
                byteArray[i] = Convert.ToByte(hexValues[i], 16);
            }

            return byteArray;
        }
        public static void ApplyPatch(byte* rom, byte[] patch)
        {
            for (int i = 0; i < patch.Length; i++)
            {
                rom[i] = patch[i];
            }
        }
    }
}
