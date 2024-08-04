#pragma once
#include <string>
#include <vector>

static const char* KeywordMap[]{
	"function",
	"debugbreak",
	"class",
	"prototype",
	"struct",
	"extern",
	"await",
	"async",
	"for",
	"var",
	"let",
	"while",
	"if",
	"break",
	"continue",
	"return",
	"else",
	"foreach",
	"throw",

	"routine",
	"ccu8call",
	"naked",
	"pcret",
	"lrret",
	"auto",
	"from",
	"U8",
	"U16",
	"U24",
	"U32",
	"I8",
	"I12",
	"I24",
	"I32",
	"void",

	"data",
};
class Lexer {
public:
	enum class TokenType {
		Identifier,
		IntegerLiteral,
		FloatLiteral,
		StringLiteral,
		Operator,
		Delimiter,
		Comment,

		FunctionKeyword,
		DebugbreakKeyword,
		ClassKeyword,
		PrototypeKeyword,
		StructKeyword,
		ExternKeyword,
		AwaitKeyword,
		AsyncKeyword,
		ForKeyword,
		VarKeyword,
		LetKeyword,
		WhileKeyword,
		IfKeyword,
		BreakKeyword,
		ContinueKeyword,
		ReturnKeyword,
		ElseKeyword,
		ForeachKeyword,
		ThrowKeyword,

		RoutineKeyword,
		Ccu8callKeyword,
		NakedKeyword,
		PcRetKeyword,
		LrRetKeyword,
		AutoKeyword,
		FromKeyword,
		U8Keyword,
		U16Keyword,
		U24Keyword,
		U32Keyword,
		I8Keyword,
		I16Keyword,
		I24Keyword,
		I32Keyword,
		VoidKeyword,

		DataKeyword,
	};

	struct Token {
		TokenType type;
		std::string_view lexeme;

		Token(TokenType tokenType, std::string_view tokenLexeme)
			: type(tokenType), lexeme(tokenLexeme) {}
	};

	Lexer(std::string_view input) : input_(input), position_(0) {}

	std::vector<Token> tokenize(bool parseComment = false) {
		std::vector<Token> tokens;

		while (position_ < input_.length()) {
			char currentChar = input_[position_];

			if (isIdentifierStart(currentChar)) {
				tokens.push_back(readIdentifier());
			}
			else if (currentChar == '/' && position_ < input_.size() - 1 && input_[position_ + 1] == '/') {
				auto pre = position_;
				while (position_ < input_.size()) {
					if (input_[position_] == '\n')
						break;
					position_++;
				}
				if (parseComment) {
					std::string_view sv = input_.substr(pre, position_ - pre);
					tokens.push_back({ TokenType::Comment, sv });
				}
			}
			else if (currentChar == '/' && position_ < input_.size() - 1 && input_[position_ + 1] == '*') {
				auto pre = position_;
				while (position_ < input_.size() - 1) {
					if (input_[position_] == '*' && input_[position_ + 1] == '/')
						break;
					position_++;
				}
				position_ += 2;
				if (parseComment) {
					std::string_view sv = input_.substr(pre, position_ - pre);
					tokens.push_back({ TokenType::Comment, sv });
				}
			}
			else if (currentChar == '0' && position_ < input_.size() - 1 && isbasenprefix(input_[position_ + 1])) {
				tokens.push_back(readBaseN());
			}
			else if (isDigit(currentChar)) {
				tokens.push_back(readNumber());
			}
			else if (isStringLiteralStart(currentChar)) {
				tokens.push_back(readStringLiteral());
			}
			else if (isOperator(currentChar)) {
				tokens.push_back(readOperator());
			}
			else if (isDelimiter(currentChar)) {
				tokens.push_back(readDelimiter());
			}
			else if (currentChar == ' ') {
				position_++;
			}
			else if (currentChar == '\t') {
				position_++;
			}
			else if (currentChar == '\r') {
				position_++;
			}
			else if (currentChar == '\n') {
				position_++;
			}
			else {
				// Unknown character
				// std::cerr << "Unknown character: " << currentChar << std::endl;
				position_++;
			}
		}

		return tokens;
	}

private:
	std::string_view input_;
	size_t position_;

	bool isbasenprefix(char ch) {
		return ch == 'b' || ch == 'o' || ch == 'x';
	}

	bool isIdentifierStart(char ch) {
		return isalpha(ch) || ch == '_';
	}

	bool isIdentifierChar(char ch) {
		return isalnum(ch) || ch == '_';
	}

	bool isDigit(char ch) {
		return isdigit(ch);
	}
	bool isBasenDigit(char ch) {
		return isdigit(ch) || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F');
	}

	bool isStringLiteralStart(char ch) {
		return ch == '"';
	}

	bool isOperator(char ch) {
		static const std::string_view operators = "+-*/%=^&#@!~?:>|<.";
		return operators.find(ch) != std::string_view::npos;
	}

	bool isDelimiter(char ch) {
		static const std::string_view delimiters = "(){}[],;";
		return delimiters.find(ch) != std::string_view::npos;
	}

	Token readIdentifier() {
		size_t start = position_;

		while (position_ < input_.length() && isIdentifierChar(input_[position_])) {
			position_++;
		}

		std::string_view lexeme = input_.substr(start, position_ - start);
		auto ptr = std::find(KeywordMap, KeywordMap + _countof(KeywordMap), lexeme);
		if (ptr != KeywordMap + _countof(KeywordMap)) {
			auto ind = ptr - KeywordMap;
			return Token((TokenType)((int)TokenType::Comment + 1 + ind), lexeme);
		}
		return Token(TokenType::Identifier, lexeme);
	}
	Token readBaseN() {
		size_t start = position_;
		position_ += 2;
		while (position_ < input_.length() && (isBasenDigit(input_[position_]))) {
			position_++;
		}

		std::string_view lexeme = input_.substr(start, position_ - start);
		return Token(TokenType::IntegerLiteral, lexeme);
	}
	Token readNumber() {
		size_t start = position_;

		while (position_ < input_.length() && (isDigit(input_[position_]) || input_[position_] == '.' || input_[position_] == 'e' || input_[position_] == 'E')) {
			position_++;
		}

		std::string_view lexeme = input_.substr(start, position_ - start);
		if (lexeme.find('.') != std::string_view::npos || lexeme.find('e') != std::string_view::npos || lexeme.find('E') != std::string_view::npos) {
			return Token(TokenType::FloatLiteral, lexeme);
		}
		else {
			return Token(TokenType::IntegerLiteral, lexeme);
		}
	}

	Token readStringLiteral() {
		size_t start = position_ + 1; // Skip the opening quote
		position_++;				  // Move past the opening quote
		while (position_ < input_.length() && input_[position_] != '"') {
			char currentChar = input_[position_];
			if (currentChar == '\\') {
				// Handle escape sequence
				position_++;
				if (position_ >= input_.length()) {
					// Invalid escape sequence
					break;
				}

				char escapeChar = input_[position_];
				switch (escapeChar) {
				case 'r':
				case 'n':
				case 't':
				case '"':
				case '\\':
					break;
				case 'u':
					position_ += 3;
					break;
				default:

					break;
				}
			}
			position_++;
		}

		std::string_view lexeme = input_.substr(start, position_ - start);
		position_++; // Move past the closing quote
		return Token(TokenType::StringLiteral, lexeme);
	}

	Token readOperator() {
		if ((long long)position_ < (long long)input_.size() - 1 && isOperator(input_[position_ + 1])) {
			auto sv = input_.substr(position_, 2);
			position_ += 2;
			return Token(TokenType::Operator, sv);
		}
		auto sv = input_.substr(position_, 1);
		position_++;
		return Token(TokenType::Operator, sv);
	}

	Token readDelimiter() {
		std::string_view lexeme = input_.substr(position_, 1);
		position_++;
		return Token(TokenType::Delimiter, lexeme);
	}
};