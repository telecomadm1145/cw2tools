#include <iostream>


class Operand {
public:
    int dsr;
    enum {
        Reg,
        Imm
    };
    union {
        struct{
            enum {
                Rn,
                ERn,
                XRn,
                QRn,
            } type;
            // 16 is EA, 17 is EA+
            int index = 0;
        };
        int offset = 0;
    };

};

enum Opcodes {
    Nop,
    Move,
    Add,
    AddC,
    Sub,
    SubC,
    ShiftLeft,
    ShiftLeftC,
    ShiftRight,
    ShiftRightC,
    LEA,
    Bcond,
    BL,
    Rt,
    Rti,
    Inc,
    Dec,
    Mul,
    Div,
    Brk,
    Swi,
    ExtBw,
    InvertCarry,
    SetCarry,
    ClearCarry,
    DisableInterrupt,
    EnableInterrupt,
    SetBit,
    ClearBit,
    ReadBit,
    Neg,
    Das,
    Daa,
    Push,
    Pop,
    Compare,
    CompareC,
    Xor,
    Or,
    And,
};

class Inst {
public:

};

int main()
{
    std::cout << "Hello World!\n";
}