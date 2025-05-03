using System;
using System.Collections.Generic;
using System.Collections.ObjectModel; // Added
using System.ComponentModel;         // Added
using System.Diagnostics;
using System.Linq;
using System.Runtime.CompilerServices; // Added
using System.Text;
using System.Windows;
using System.Windows.Controls;

// Assuming these are correctly defined elsewhere and accessible
using static cw2tools.CasioInternal.Static;
using static cw2tools.CasioInternal.Strings;


namespace cw2tools
{
    /// <summary>
    /// Interaction logic for TokenEditor.xaml
    /// </summary>
    public unsafe partial class TokenEditor : Window
    {
        // --- Helper Class for Data Binding ---
        public class DisplayToken(int codePoint, TokenEditor.Token token) : INotifyPropertyChanged
        {
            private string _text = token.str;
            private bool _isModified;

            public int CodePoint { get; } = codePoint;

            public string CodePointHex => CodePoint < 0x100 ? $"{CodePoint:X2}" : $"{CodePoint:X4}"; // Format
            public string OriginalText { get; } = token.str;
            public string TextHex { get; } = token.hex;
            public byte* Ptr { get; } = token.ptr;
            public int OriginalLength { get; } = token.len;

            public string Text
            {
                get => _text;
                set
                {
                    if (_text != value)
                    {
                        _text = value;
                        IsModified = true; // Mark as modified when text changes
                        OnPropertyChanged();
                    }
                }
            }

            public bool IsModified
            {
                get => _isModified;
                private set // Only allow setting internally or via Text setter
                {
                    if (_isModified != value)
                    {
                        _isModified = value;
                        OnPropertyChanged();
                        OnPropertyChanged(nameof(DisplayStatus)); // Update status display
                    }
                }
            }

            // Example property to show modification status in UI
            public string DisplayStatus => IsModified ? "*" : "";

            // --- INotifyPropertyChanged Implementation ---
            public event PropertyChangedEventHandler PropertyChanged;
            protected void OnPropertyChanged([CallerMemberName] string propertyName = null)
            {
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
            }

            public void MarkAsSaved()
            {
                IsModified = false;
                // Could update OriginalText here if desired:
                // OriginalText = _text;
                // OnPropertyChanged(nameof(OriginalText));
            }
        }

        // --- Original Token Class (slightly adjusted if needed, but looks okay) ---
        // Keep this internal or private if DisplayToken is the public interface
        public class Token
        {
            public string str { get; set; }
            public string hex { get; set; }
            public byte* ptr { get; set; }
            public int len { get; set; }
        }

        // --- Member Variables ---
        private Dictionary<int, Token> _internalTokens = new();
        public ObservableCollection<DisplayToken> DisplayTokens { get; } = new ObservableCollection<DisplayToken>();

        // --- Constructor ---
        public TokenEditor()
        {
            InitializeComponent();
            // Set the DataContext for bindings (can also be done in XAML)
            // If the ObservableCollection is directly on the Window class:
            this.DataContext = this;
            // Or if you create a separate ViewModel class, set DataContext to that.
            // For this example, we bind directly to the collection property on the Window.
            // The XAML ListView ItemsSource should bind to "DisplayTokens".
        }

        // --- Button Click Handlers ---

        // Load / Auto Search Button
        private void SearchButton_Click(object sender, RoutedEventArgs e)
        {
            if (rom == null)
            {
                MessageBox.Show("ROM is not loaded.", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                return;
            }

            try
            {
                LoadCharacterMap(); // Ensure character map is ready if needed by strdup/strlen
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Failed to load character map: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Warning);
                // Continue anyway? Or return? Depends on whether strdup/strlen need it.
            }

            _internalTokens.Clear();
            DisplayTokens.Clear(); // Clear the collection bound to the ListView

            try
            {
                if (is_cwii)
                {
                    SearchTokensCWII();
                }
                else
                {
                    SearchTokensLegacy();
                }

                // Populate the ObservableCollection from the internal dictionary
                // Sort by CodePoint for consistent display
                foreach (var kvp in _internalTokens.OrderBy(x => x.Key))
                {
                    DisplayTokens.Add(new DisplayToken(kvp.Key, kvp.Value));
                }

                if (DisplayTokens.Count == 0)
                {
                    MessageBox.Show("No tokens found automatically.", "Info", MessageBoxButton.OK, MessageBoxImage.Information);
                }
                else
                {
                    // Optionally, update status or title
                    Title = $"Token Editor - {DisplayTokens.Count} tokens loaded";
                }

            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Error during token search: {ex}");
                MessageBox.Show($"An error occurred during token search:\n{ex.Message}", "Search Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        // Save / Refresh Button
        private void SaveRefreshButton_Click(object sender, RoutedEventArgs e)
        {
            if (rom == null)
            {
                MessageBox.Show("ROM is not loaded. Cannot save.", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                return;
            }
            
            var dialog = new Microsoft.Win32.SaveFileDialog
            {
                FileName = "Tokens",
                DefaultExt = ".csv",
                Filter = "CSV files (*.csv)|*.csv|All files (*.*)|*.*"
            };

            bool? result = dialog.ShowDialog();
            if (result != true)
                return;

            try
            {
                var lines = new List<string>
                {
                    "Code,Hex,Text,Len"
                };

                foreach (var token in DisplayTokens)
                {
                    string line = $"{token.CodePointHex},\"{token.TextHex.Replace("\"", "\"\"")}\",\"{token.OriginalText.Replace("\"", "\"\"")}\",{token.OriginalLength}";
                    lines.Add(line);
                }

                System.IO.File.WriteAllLines(dialog.FileName, lines, Encoding.UTF8);
                MessageBox.Show("Export successful.", "Success", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error saving file:\n{ex.Message}", "Save Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }


        // --- Private Search Methods (extracted from original Button_Click) ---

        private void SearchTokensCWII()
        {
            var func = FindSignature(rom, 0x60000, "ce f8 01 ?? ?? ?? 25 fa 00 05 00 e6 00 ec 00 02 a1 92 00 84 00 71".ToUpper());
            if (func == 0)
            {
                Debug.WriteLine("CWII: char_to_string signature search failed");
                throw new Exception("CWII: Failed to find token processing function signature."); // Or return silently
            }
            Debug.WriteLine($"CWII: char_to_string func found at ROM offset: 0x{func - (nint)rom:X6}");
            func += 20; // Offset to the start of the jump table processing

            Dictionary<int, nint> subroutines = new();
            Dictionary<int, (int ptr, int count)> tables = new();

            // Parse the jump table based on opcodes
            while (((byte*)func)[1] == 0x71 && ((byte*)func)[3] == 0xc9) // Check for specific jump instruction pattern
            {
                subroutines.Add(((byte*)func)[0], func + 4 + ((sbyte*)func)[2] * 2);
                func += 4;
            }

            // Process the subroutines to find the actual token tables
            foreach (var rt in subroutines)
            {
                var rtd = (byte*)rt.Value;
                // Basic sanity checks on expected structure could be added here
                // Example: if(rtd[1] != some_expected_value) { Debug.WriteLine($"Warning: Unexpected structure for sub {rt.Key:X2}"); continue; }
                Debug.WriteLine($"CWII: Subroutine {rt.Key:X2} at 0x{rt.Value - (nint)rom:X6} -> Table Addr: {(rtd[0] | (rtd[2] << 8)):X4}, Count Addr: {*(ushort*)(rom + *(ushort*)&rtd[6]):X4}"); // Original debug line, might need adjustment based on actual structure
                // Assuming the original interpretation is correct:
                int tableBasePtrOffset = rtd[0] | (rtd[2] << 8); // Offset in ROM to the pointer array
                int countValueAddr = *(ushort*)&rtd[6]; // Address within the rtd structure containing the address of the count value? This looks suspicious. Let's assume it's an offset from ROM base.
                                                        // Re-evaluate this part: *(ushort*)(rom + *(ushort*)&rtd[6])
                                                        // Let's assume rtd[6] and rtd[7] form an offset into the ROM where the count is stored.
                ushort countOffset = *(ushort*)&rtd[6]; // Offset from ROM base to where the count value is stored
                int count = *(ushort*)(rom + countOffset); // The actual count

                tables.Add(rt.Key, (tableBasePtrOffset, count));

                // Safer interpretation might be needed depending on the exact assembly
            }

            // Read the tokens from the tables
            foreach (var tb in tables)
            {
                ushort* tablePtr = (ushort*)(rom + tb.Value.ptr);
                // Use Math.Min to avoid reading past expected table size or 0x100 limit
                int limit = Math.Min(0x100, tb.Value.count);
                for (int i = 0; i < limit; i++)
                {
                    // CWII structure seems to be pairs of (index, pointer_offset)
                    // Accessing as [(i << 1) + 1] suggests reading the pointer part of pairs.
                    // Verify this structure. If it's just a list of pointers: ushort offset = tablePtr[i];
                    ushort offset = tablePtr[(i << 1) + 1]; // Get the offset from the table
                    byte* ptr = rom + offset;
                    string text = strdup(ptr); // Decode using current map
                    string hex = strhex(ptr); // Decode using current map
                    int len = (int)strlen(ptr);  // Get length
                    _internalTokens.Add((tb.Key << 8) | i, new Token() { str = text, hex = hex, ptr = ptr, len = len });
                }
            }
            Debug.WriteLine($"CWII: Found {_internalTokens.Count} tokens.");
        }

        private void SearchTokensLegacy()
        {
            // Use a temporary buffer on the stack for processing strings if needed
            byte* tempBuffer = stackalloc byte[192]; // As in original code

            var func = (byte*)FindSignature(rom, 0x40000, "5e f4 5e f6 00 e6 2a f0 00 70");
            if (func == null)
            {
                Debug.WriteLine("Legacy: Token signature search failed");
                throw new Exception("Legacy: Failed to find token processing function signature."); // Or return silently
            }
            Debug.WriteLine($"Legacy: Token func found at ROM offset: 0x{(nint)func - (nint)rom:X6}");
            func += 8 + 4; // Adjusted offset based on pattern "5e f4 5e f6 00 e6 2a f0 00 70" -> point after 00 70

            Dictionary<int, nint> subroutines = new();
            Dictionary<int, (int textPtrOffset, int attrPtrOffset)> tables = new();

            // Parse the jump table
            while (func[1] == 0x71 && func[3] == 0xc9) // Standard jump?
            {
                subroutines.Add(func[0], (nint)(func + 4 + ((sbyte*)func)[2] * 2));
                func += 4;
            }
            // Handle potential last entry with different jump type (if applicable)
            if (func[1] == 0x71 && func[3] == 0xc8) // Different jump type?
            {
                subroutines.Add(func[0], (nint)(func + 4)); // Direct jump? Offset calculation might be different
                                                            // Need to verify assembly for 0xc8 variant
                                                            // func += 4; // Move past this entry if handled
            }
            // else if it's not a recognized pattern, stop parsing

            // Process subroutines to find table pointers
            foreach (var rt in subroutines)
            {
                var rtd = (byte*)rt.Value;
                int textPtrOffset = rtd[0] | (rtd[2] << 8);
                int attrPtrOffset = rtd[4] | (rtd[6] << 8);
                Debug.WriteLine($"Legacy: Subroutine {rt.Key:X2} at 0x{rt.Value - (nint)rom:X6} -> Text Table Offset: {textPtrOffset:X4}, Attr Table Offset: {attrPtrOffset:X4}");
                tables.Add(rt.Key, (textPtrOffset, attrPtrOffset));
            }

            // Read tokens using the tables
            foreach (var tb in tables)
            {
                ushort* textTablePtr = (ushort*)(rom + tb.Value.textPtrOffset);
                byte* attrTablePtr = rom + tb.Value.attrPtrOffset;

                for (int i = 0; i < 0x100; i++) // Assume 256 entries per table
                {
                    ushort textOffset = textTablePtr[i];
                    byte* ptr = rom + textOffset;
                    byte attr = attrTablePtr[i];

                    int len = attr & 0x0f; // Low nibble = length
                    int off = (attr >> 4) & 0x0f; // High nibble = offset

                    byte* effectivePtr = ptr;
                    if (off != 0xf) // 0xf seems to be a special case marker
                    {
                        effectivePtr += off; // Apply offset from the base pointer
                    }

                    // Original code copied bytes based on 'k' count, maybe for handling multi-byte chars?
                    // Let's try using strdup directly first, assuming null termination or reading 'len' chars
                    // If strdup doesn't work correctly due to missing null terminator or encoding issues:

                    // Fallback: Copy 'len' *logical* characters or up to buffer size
                    int byteCount = 0;
                    int charCount = 0;
                    byte* readPtr = effectivePtr;
                    // This loop mimics the original logic closely, copying bytes until 'len' *characters* are read
                    // or buffer is full. It assumes single/double byte encoding.
                    while (charCount < len && byteCount < 190) // Leave space for null terminator
                    {
                        byte currentByte = *readPtr;
                        if (currentByte == 0) break; // Stop at null terminator

                        tempBuffer[byteCount++] = currentByte;
                        readPtr++;

                        // Simple heuristic: Increment char count unless it's a lead byte (e.g., Shift-JIS)
                        // or a control code. Your original check: (ptr[x] < 0xef && ptr[x] != 4)
                        // This needs accurate character encoding knowledge. Let's use the original check:
                        if (currentByte < 0xef && currentByte != 4) // Assuming this correctly identifies single-byte chars or end of multi-byte
                        {
                            charCount++;
                        }
                        // This logic might need refinement based on the exact encoding!
                    }
                    tempBuffer[byteCount] = 0; // Null terminate the buffer

                    string text = strdup(tempBuffer); // Decode the copied buffer
                    string hex = strhex(tempBuffer); // Decode the copied buffer
                    int actualLen = byteCount; // The number of bytes copied

                    if (off == 0xf)
                    {
                        text += "("; // Indicate the special offset case
                    }

                    _internalTokens.Add((tb.Key << 8) | i, new Token() { str = text, hex = hex, ptr = effectivePtr, len = actualLen }); // Use actual length and effective pointer
                }
            }
            Debug.WriteLine($"Legacy: Found {_internalTokens.Count} tokens.");
        }
    }
}