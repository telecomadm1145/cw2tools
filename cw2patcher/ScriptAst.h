#pragma once
#include <vector>
#include "ScriptLexer.h"
#include <map>
#include <format>

enum class UnOp {
	Nop,
	Not,
	Bnot,
	Negative,
	Positive,
	Increase,
	Decrease,
	PostfixIncrease,
	PostfixDecrease,
};
enum class BinOp {
	Nop,
	Add,
	Sub,
	Mul,
	Div,
	Mov,
	Member,
	Index,

	Greater,
	Lesser,
	IsEqual,
	GreaterOrEqual,
	LesserOrEqual,
	NotEqual,

	Or,
	And,
	Band,
	Bor,
	Xor,

	Range,

	AddMov,
	SubMov,
	MulMov,
	DivMov,
	BandMov,
	BorMov,
	XorMov,
};
struct TypeRef {
	enum {
		Void,
		U8,
		U16,
		U24,
		U32,
		I8,
		I16,
		I24,
		I32,
		Structure,
	} Type;
	std::string StructureName;
	bool Pointer;
	bool FarPointer;
};
struct Structure {
public:
	size_t size;
	struct Field {
	public:
		std::string name;
		TypeRef type;
		size_t size;
		size_t offset;
	};
	std::vector<Field> fields;
};
struct Linkable {
	enum {
		External,
		Spare,
		Fixed,
		Reference,
	} Type;
	std::string reference;
	size_t offset;
};
struct DataDefine : public Linkable {
	TypeRef datatype;
};
struct Function : public Linkable {
	std::vector<TypeRef> ArgumentTypes;
	TypeRef ReturnType;
	enum {
		Auto,
		Naked,
		CCU8Call,
		PCRet,
		LRRet
	} CompilingConversion;
	std::vector<Lexer::Token> tokens;
};
struct Pass1Cache {
public:
	std::map<std::string, Structure> structures;
	std::map<std::string, DataDefine> data_defines;
	std::map<std::string, Function> functions;
	std::vector<Lexer::Token> tokens;
};
/// <summary>
/// 这是一个主体是递归下降的解析器
/// </summary>
class Parser {
public:
	Parser(std::vector<Lexer::Token> tokens) : tokens_(tokens), position_(0) {}
	TypeRef parse_typeref() {
		TypeRef tr{};
		if (match(Lexer::TokenType::VoidKeyword))
			tr = { TypeRef::Void };
		else if (match(Lexer::TokenType::U8Keyword))
			tr = { TypeRef::U8 };
		else if (match(Lexer::TokenType::U16Keyword))
			tr = { TypeRef::U16 };
		else if (match(Lexer::TokenType::U24Keyword))
			tr = { TypeRef::U24 };
		else if (match(Lexer::TokenType::U32Keyword))
			tr = { TypeRef::U32 };
		else if (match(Lexer::TokenType::I8Keyword))
			tr = { TypeRef::I8 };
		else if (match(Lexer::TokenType::I16Keyword))
			tr = { TypeRef::I16 };
		else if (match(Lexer::TokenType::I24Keyword))
			tr = { TypeRef::I24 };
		else if (match(Lexer::TokenType::I32Keyword))
			tr = { TypeRef::I32 };
		else
			tr = { TypeRef::Structure, (std::string)next() };
		if (match("far")) {
			expect("*");
			tr.FarPointer = true;
		}
		else if (match("*")) {
			tr.Pointer = true;
		}
		return tr;
	}
	bool parse_location(Linkable& l) {
		if (match("spare")) {
			l.offset = Linkable::Spare;
			return 1;
		}
		else if (match(Lexer::TokenType::IntegerLiteral)) {
			l.offset = Linkable::Fixed;
			return 1;
		}
	}
	void SkipScope(Function& f) {
		int count = 1;
		for (;;) {
			if (match("{"))
				count++;
			else if (match("}"))
				count--;
			else {
				if (count == 0)
					break;
				else {
					f.tokens.push_back(tokens_[position_++]);
				}
				continue;
			}

			if (count == 0)
				break;
			else {
				f.tokens.push_back(tokens_[position_ - 1]);
			}
		}
	}
	void parse_structure(Structure& structure) {
		expect("{");
		while (!match("}")) {
			expect(Lexer::TokenType::DataKeyword);
			std::string_view fieldName = next();
			expect(":");
			structure.fields.push_back({
				(std::string)fieldName,
				parse_typeref(), // Field type
				0,				 // Field size (set to 0 initially, may need calculation)
				0				 // Field offset (set to 0 initially, may need calculation)
			});
			expect(";");
		}
	}
	Pass1Cache pass1() {
		Pass1Cache cache;
		position_ = 0;
		while (position_ < tokens_.size()) {
			if (match(Lexer::TokenType::RoutineKeyword)) {
				Function func{};
				bool location_declared = false;
				if (match(Lexer::TokenType::Ccu8callKeyword))
					func.CompilingConversion = Function::CCU8Call;
				else if (match(Lexer::TokenType::NakedKeyword))
					func.CompilingConversion = Function::Naked;
				else if (match(Lexer::TokenType::PcRetKeyword))
					func.CompilingConversion = Function::PCRet;
				else if (match(Lexer::TokenType::LrRetKeyword))
					func.CompilingConversion = Function::LRRet;
				else if (match(Lexer::TokenType::AutoKeyword))
					0;
				std::string_view name = next();
				if (match("@")) {
					location_declared = parse_location(func);
				}
				expect("(");
				while (!match(")")) {
					next();
					expect(":");
					func.ArgumentTypes.push_back(parse_typeref());
				}
				expect(":");
				func.ReturnType = parse_typeref();
				if (match(Lexer::TokenType::FromKeyword)) {
					func.Type = Function::External;
					func.reference = next();
					location_declared = true;
				}
				if (!location_declared) {
					throw new std::exception("Function has no location declaration.");
				}
				if (match("{"))
					SkipScope(func);
				else if (match(";"))
					0;
				else
					throw new std::exception("Expect a scpoe or a semicolon.");
				auto nm = (std::string)name;
				if (cache.functions.find(nm) != cache.functions.end())
					throw new std::exception("Function redefined.");
				cache.functions[nm] = func;
			}
			else if (match(Lexer::TokenType::DataKeyword)) {
				DataDefine dd{};
				std::string_view name = next();
				expect("@");
				if (!parse_location(dd))
					throw new std::exception("Data needs location declaration.");
				expect(":");
				dd.datatype = parse_typeref();
				auto nm = (std::string)name;
				if (cache.data_defines.find(nm) != cache.data_defines.end())
					throw new std::exception("Data redefined.");
				cache.data_defines[nm] = dd;
			}
			else if (match(Lexer::TokenType::StructKeyword)) { // Handle struct declarations
				Structure structure;
				std::string_view name = next();
				parse_structure(structure); // Parse the structure fields
				auto nm = (std::string)name;
				if (cache.structures.find(nm) != cache.structures.end())
					throw new std::exception("Structure redefined.");
				cache.structures[nm] = structure;
			}
			else if (match(";")) {
			}
			else
				cache.tokens.push_back(tokens_[position_++]);
		}
		return cache;
	}
	void pass2(Pass1Cache& p1) {
		position_ = 0;
		for (auto& func : p1.functions)
			parse_function(func.second);
	}
	void parse_function(Function& func) {
		std::vector<Lexer::Token> backup = tokens_;
		size_t backup_2 = position_;
		
		tokens_ = backup;
		position_ = backup_2;
	}
	size_t GetPos() const {
		return position_;
	}

private:
	std::vector<Lexer::Token> tokens_;
	size_t position_;

	bool match(Lexer::TokenType type) {
		if (position_ < tokens_.size() && tokens_[position_].type == type) {
			position_++;
			return true;
		}

		return false;
	}

	bool match(Lexer::TokenType type, std::string_view lexeme) {
		if (position_ < tokens_.size() && tokens_[position_].type == type && tokens_[position_].lexeme == lexeme) {
			position_++;
			return true;
		}

		return false;
	}
	bool match(std::string_view lexeme) {
		if (position_ < tokens_.size() && is_id(tokens_[position_].type) && tokens_[position_].lexeme == lexeme) {
			position_++;
			return true;
		}

		return false;
	}
	std::string_view next() {
		if (position_ < tokens_.size()) {
			return tokens_[position_++].lexeme;
		}
		return "";
	}
	std::string_view peek() {
		if (position_ < tokens_.size() && is_id(tokens_[position_].type)) {
			return tokens_[position_].lexeme;
		}
		return "";
	}
	bool is_id(Lexer::TokenType tk) {
		using Lexer::TokenType::Operator, Lexer::TokenType::Identifier, Lexer::TokenType::Delimiter;
		return tk == Operator || tk == Identifier || tk == Delimiter;
	}
	void expect(Lexer::TokenType type, std::string_view lexeme) {
		if (position_ < tokens_.size() && tokens_[position_].type == type && tokens_[position_].lexeme == lexeme) {
			position_++;
			return;
		}
		auto s = std::format("Expect \"{}\" however got a \"{}\".", lexeme, tokens_[position_].lexeme);
		throw std::exception(s.c_str());
	}
	void expect(std::string_view lexeme) {
		if (position_ < tokens_.size() && is_id(tokens_[position_].type) && tokens_[position_].lexeme == lexeme) {
			position_++;
			return;
		}
		auto s = std::format("Expect \"{}\" however got a \"{}\".", lexeme, tokens_[position_].lexeme);
		throw std::exception(s.c_str());
	}

	void expect(Lexer::TokenType type) {
		if (position_ < tokens_.size() && tokens_[position_].type == type) {
			position_++;
			return;
		}
		// auto s = std::format("Expect \"{}\" however got a \"{}\".", type, tokens_[position_].lexeme);
		throw std::exception("Illegal character.");
	}
};