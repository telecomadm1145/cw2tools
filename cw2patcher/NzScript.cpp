// NzScript.cpp : 此文件包含 "main" 函数。程序执行将在此处开始并结束。
//

#include "ScriptAst.h"
#include "ScriptLexer.h"
#include "GameBuffer.h"
#include <thread>
#include <windows.h>
#include <iostream>


void startup() {
	auto hstdin = GetStdHandle(STD_INPUT_HANDLE);
	unsigned long mode = 0;
	GetConsoleMode(hstdin, &mode);
	mode = (mode | ENABLE_MOUSE_INPUT) & (~ENABLE_QUICK_EDIT_MODE);
	SetConsoleMode(hstdin, mode);
	auto hstdout = GetStdHandle(STD_OUTPUT_HANDLE);
	GetConsoleMode(hstdout, &mode);
	mode = mode | ENABLE_VIRTUAL_TERMINAL_PROCESSING;
	SetConsoleMode(hstdout, mode);
	SetConsoleOutputCP(65001);
}
void doExecute(auto exp, auto& ctx) {
	__try {
		exp->Execute(ctx);
	}
	__except (GetExceptionCode() == EXCEPTION_STACK_OVERFLOW) {
		std::cout << "Stack overflow.";
		_resetstkoflw();
	}
}
int main() {
	std::string undobuf = "";
	std::string inputbuf = "";
	int cursor = 0;
	int curx = 0;
	int cury = 0;
	int errorToken = -1;
	startup();
	GameBuffer buf{ [](const char* buf, size_t sz) {
		std::cout.write(buf, sz);
	} };
	HANDLE hInput = GetStdHandle(STD_INPUT_HANDLE);
	HANDLE hConsole = GetStdHandle(STD_OUTPUT_HANDLE);
	CONSOLE_SCREEN_BUFFER_INFO csbi;
	INPUT_RECORD ir{};
	DWORD _;
	int scrolly = 0;
	while (1) {
		GetConsoleScreenBufferInfo(hConsole, &csbi);
		buf.ResizeBuffer(csbi.dwSize.X, csbi.dwSize.Y);
		buf.Clear();
		Lexer lex{ inputbuf };
		auto tokens = lex.tokenize(true);
		enum class PredefinedColor {
			None,
			Keyword,
			Ctrlflow,
			GlobalVariable,
			LocalVariable,
			String,
			Number,
			Function,
			Comment,
			Invalid = -1,
		};
		std::vector<PredefinedColor> map;
		map.resize(inputbuf.size() + 20, PredefinedColor::None);
		for (size_t j = 0; j < tokens.size(); j++) {
			auto& tok = tokens[j];
			auto off1 = &*tok.lexeme.begin() - &*inputbuf.begin();
			auto off2 = off1 + tok.lexeme.size();
			auto clr = PredefinedColor::None;
			switch (tok.type) {
			case Lexer::TokenType::Identifier: {
				if (tok.lexeme == "_this") {
					clr = PredefinedColor::Function;
					break;
				}
				if (j < tokens.size() - 1 && tokens[j + 1].lexeme == "(" && tokens[j + 1].type == Lexer::TokenType::Delimiter) {
					clr = PredefinedColor::Function;
					break;
				}
				clr = PredefinedColor::LocalVariable;
			} break;
			case Lexer::TokenType::FloatLiteral:
			case Lexer::TokenType::IntegerLiteral: {
				clr = PredefinedColor::Number;
				break;
			}
			case Lexer::TokenType::StringLiteral: {
				off1--;
				off2++;
				clr = PredefinedColor::String;
				break;
			}
			case Lexer::TokenType::Comment: {
				clr = PredefinedColor::Comment;
				break;
			}
			default:
				if (tok.lexeme == "for" ||
					tok.lexeme == "while" ||
					tok.lexeme == "if" ||
					tok.lexeme == "break" ||
					tok.lexeme == "continue" ||
					tok.lexeme == "return" ||
					tok.lexeme == "else" ||
					tok.lexeme == "foreach" ||
					tok.lexeme == "throw") {
					clr = PredefinedColor::Ctrlflow;
					break;
				}
				if (tok.type > Lexer::TokenType::Comment) {
					clr = PredefinedColor::Keyword;
					break;
				}
				break;
			}
			if (j == errorToken) {
				clr = PredefinedColor::Invalid;
			}
			for (size_t i = off1; i < off2; i++) {
				map[i] = clr;
			}
		}
		curx = cury = 0;
		bool setted = 0;
		auto cx = 4, cy = scrolly;
		int linenum = 1;
		buf.DrawString(std::to_string(linenum), 0, cy, {}, {});
		for (size_t i = 0; i < inputbuf.size(); i++) {
			auto c = inputbuf[i];
			if (!setted && i >= cursor) {
				curx = cx;
				cury = cy;
				setted = true;
			}
			if (c == '\t') {
				buf.SetPixel(cx, cy, { { 255, 20, 20, 20 }, {}, '|' });
				cx += 4;
				continue;
			}
			if (cx >= csbi.dwSize.X - 1) {
				cx = 4;
				cy++;
				i--;
				continue;
			}
			if (c == '\n') {
				linenum++;
				buf.DrawString(std::to_string(linenum), 0, cy + 1, {}, {});
				buf.SetPixel(cx, cy, { { 255, 120, 120, 120 }, {}, 0x21B5 });
				cx = 4;
				cy++;
				continue;
			}
			Color clr{};
			switch (map[i]) {
			case PredefinedColor::Ctrlflow: {
				clr = { 255, 216, 160, 223 };
				break;
			}
			case PredefinedColor::Keyword: {
				clr = { 255, 86, 156, 214 };
				break;
			}
			case PredefinedColor::String: {
				clr = { 255, 214, 157, 133 };
				break;
			}
			case PredefinedColor::Number: {
				clr = { 255, 181, 206, 168 };
				break;
			}
			case PredefinedColor::LocalVariable: {
				clr = { 255, 156, 220, 254 };
				break;
			}
			case PredefinedColor::Function: {
				clr = { 255, 220, 220, 170 };
				break;
			}
			case PredefinedColor::Invalid: {
				clr = { 255, 255, 40, 40 };
				break;
			}
			case PredefinedColor::Comment: {
				clr = { 255, 87, 166, 74 };
				break;
			}
			default:
				clr = { 255, 180, 180, 180 };
				break;
			}
			buf.SetPixel(cx, cy, { clr, {}, (unsigned int)c });
			cx++;
		}
		if (!setted) {
			curx = cx;
			cury = cy;
		}
		std::cout << "\u001b[?25l";
		std::cout.flush();
		buf.Output();
		std::cout << std::dec << "\u001b[" << cury + 1 << ";" << curx + 1 << "H";
		std::cout << "\u001b[?25h";
		std::cout.flush();
		while (true) {
			if (cury >= csbi.dwSize.Y - 1) {
				scrolly -= 5;
				cury -= 5;
			}
			else if (cury < 0) {
				scrolly += 5;
				cury += 5;
			}
			else
				break;
		}
		ReadConsoleInput(hInput, &ir, 1, &_);
		if (ir.EventType == MOUSE_EVENT) {
			auto me = ir.Event.MouseEvent;
			if (me.dwEventFlags == MOUSE_WHEELED) {
				if (me.dwButtonState & 0x80000000) { 
					scrolly++;
				}
				else {
					scrolly--;
				}
			}
		}
		if (ir.EventType == KEY_EVENT && ir.Event.KeyEvent.bKeyDown) {
			if (ir.Event.KeyEvent.wVirtualKeyCode == 'Z') {
				if ((ir.Event.KeyEvent.dwControlKeyState & 0x4) || (ir.Event.KeyEvent.dwControlKeyState & 0x8)) {
					cursor = std::clamp(cursor, 0, (int)undobuf.size());
					std::swap(undobuf, inputbuf);
					continue;
				}
			}
			switch (ir.Event.KeyEvent.wVirtualKeyCode) {
			case VK_LEFT: {
				if (cursor > 0)
					cursor--;
				continue;
			}
			case VK_RIGHT: {
				if (cursor < inputbuf.size())
					cursor++;
				continue;
			}
			case VK_UP: {
				int lineStart = cursor;
				while (lineStart > 0 && inputbuf[lineStart - 1] != '\n') {
					lineStart--;
				}
				int columnOffset = cursor - lineStart;

				int prevLineEnd = lineStart - 1;
				if (prevLineEnd >= 0) {
					int prevLineStart = prevLineEnd;
					while (prevLineStart > 0 && inputbuf[prevLineStart - 1] != '\n') {
						prevLineStart--;
					}
					cursor = prevLineStart + min(columnOffset, prevLineEnd - prevLineStart);
				}
				continue;
			}

			case VK_DOWN: {
				int lineStart = cursor;
				while (lineStart > 0 && inputbuf[lineStart - 1] != '\n') {
					lineStart--;
				}
				int columnOffset = cursor - lineStart;

				int nextLineStart = cursor;
				while (nextLineStart < inputbuf.size() && inputbuf[nextLineStart] != '\n') {
					nextLineStart++;
				}
				if (nextLineStart < inputbuf.size()) {
					nextLineStart++; // 移动到下一行的开始
					int nextLineEnd = nextLineStart;
					while (nextLineEnd < inputbuf.size() && inputbuf[nextLineEnd] != '\n') {
						nextLineEnd++;
					}
					cursor = nextLineStart + min(columnOffset, nextLineEnd - nextLineStart);
				}
				continue;
			}


			case VK_END: {
				if ((ir.Event.KeyEvent.dwControlKeyState & 0x4) || (ir.Event.KeyEvent.dwControlKeyState & 0x8)) {
					cursor = static_cast<int>(inputbuf.size() - 1);
					continue;
				}
				while (cursor < inputbuf.size()) {
					if (inputbuf[cursor] == '\n')
						break;
					cursor++;
				}
				continue;
			}
			case VK_HOME: {
				if ((ir.Event.KeyEvent.dwControlKeyState & 0x4) || (ir.Event.KeyEvent.dwControlKeyState & 0x8)) {
					cursor = 0;
					continue;
				}
				while (cursor > 0) {
					if (inputbuf[cursor - 1] == '\n')
						break;
					cursor--;
				}
				continue;
			}
			case 13: {
				undobuf = inputbuf;
				if ((ir.Event.KeyEvent.dwControlKeyState & 0x4) || (ir.Event.KeyEvent.dwControlKeyState & 0x8)) {
					{
						LARGE_INTEGER l{};
						QueryPerformanceFrequency(&l);
						LARGE_INTEGER li{};
						QueryPerformanceCounter(&li);
						std::cout << "\u001b[38;2;255;255;255m\u001b[" << linenum + 2 << ";" << 1 << "H";
						std::cout << "Output:\n";
						Lexer lex2{ inputbuf };
						Parser p{ lex2.tokenize() };
						auto cache = p.pass1();

						std::cin.get();
						std::cin.clear();
					}
					continue;
				}
				int indent = 0;
				bool instr = 0;
				for (size_t i = 0; i < cursor; i++) {
					if (!instr && inputbuf[i] == '{') {
						indent++;
					}
					if (!instr && inputbuf[i] == '}') {
						indent--;
					}
					if (!instr && inputbuf[i] == '(') {
						indent++;
					}
					if (!instr && inputbuf[i] == ')') {
						indent--;
					}
					if (!instr && inputbuf[i] == '[') {
						indent++;
					}
					if (!instr && inputbuf[i] == ']') {
						indent--;
					}
					if (inputbuf[i] == '\"') {
						instr = !instr;
					}
					if (inputbuf[i] == '\\') {
						i++;
					}
				}
				inputbuf.insert(inputbuf.begin() + cursor, '\n');
				cursor++;
				for (size_t i = 0; i < indent; i++) {
					inputbuf.insert(inputbuf.begin() + cursor, '\t');
					cursor++;
				}
				continue;
			}
			case 8: {
				undobuf = inputbuf;
				if ((ir.Event.KeyEvent.dwControlKeyState & 0x4) || (ir.Event.KeyEvent.dwControlKeyState & 0x8)) {
					cursor = 0;
					inputbuf.resize(0);
					continue;
				}
				if (cursor > 0)
					cursor--;
				errorToken = -1;
				inputbuf.erase(inputbuf.begin() + cursor);
				continue;
			}
			case VK_DELETE: {
				undobuf = inputbuf;
				if ((ir.Event.KeyEvent.dwControlKeyState & 0x4) || (ir.Event.KeyEvent.dwControlKeyState & 0x8)) {
					cursor = 0;
					inputbuf.resize(0);
					continue;
				}
				errorToken = -1;
				inputbuf.erase(inputbuf.begin() + cursor);
				continue;
			}
			case VK_INSERT: {
				auto glo = GlobalAlloc(0, inputbuf.size() + 1);
				if (glo == 0)
					continue;
				auto p = GlobalLock(glo);
				if (p == 0)
					continue;
				memcpy(p, inputbuf.data(), inputbuf.size() + 1);
				GlobalUnlock(p);
				OpenClipboard(GetConsoleWindow());
				EmptyClipboard();
				SetClipboardData(CF_TEXT, glo);
				CloseClipboard();
				continue;
			}
			case 9: {
				undobuf = inputbuf;
				inputbuf.insert(inputbuf.begin() + cursor, '\t');
				cursor++;
				break;
			}
			default:
				break;
			}
			if (ir.Event.KeyEvent.uChar.AsciiChar < 32)
				continue;
			errorToken = -1;
			undobuf = inputbuf;
			if (ir.Event.KeyEvent.uChar.AsciiChar == '}' || ir.Event.KeyEvent.uChar.AsciiChar == ')' || ir.Event.KeyEvent.uChar.AsciiChar == ']') {
				if (cursor > 0) {
					if (inputbuf[cursor - 1] == '\t') {
						inputbuf.erase(inputbuf.begin() + --cursor);
					}
				}
			}
			inputbuf.insert(inputbuf.begin() + cursor, ir.Event.KeyEvent.uChar.AsciiChar);
			cursor++;
		}
	}
}
