// sum.cpp : 此文件包含 "main" 函数。程序执行将在此处开始并结束。
//

#include <iostream>
#include <fstream>
#include <vector>
#include <iomanip>

using word = unsigned short;
using byte = unsigned char;

inline word le_read(auto& p) {
	// this works for le machine
	return *(word*)&p;
}
inline void le_write(auto& p, word w) {
	// this works for le machine
	*(word*)&p = w;
}

void calc(word& sum, byte* bt, int len) {
	for (size_t i = 0; i < len; i += 2)
	{
		sum -= le_read(bt[i]);
	}
}

void calc2(word& sum, byte* bt, int len) {
	for (size_t i = 0; i < len; i++)
	{
		sum -= bt[i];
	}
}
//void calc3(word& sum, byte* bt,byte r11, int len) {
//	for (size_t i = 0; i < len; i++)
//	{
//		sum -= (r11 << 8) | bt[i];
//	}
//}

int main(int argc, char* argv[]) {
	if (argc < 2) {
		std::cerr << "Usage: " << argv[0] << " <rom path> (<new_rom_path>)" << std::endl;		std::cin.get();
		return 1;
	}
	std::ifstream ifs{ argv[1],std::ios::in | std::ios::binary };
	if (!ifs)
	{
		std::cerr << "Cannot open file!!!\n";		std::cin.get();
		return 1;
	}
	std::vector<unsigned char> rom((std::istreambuf_iterator<char>(ifs)), std::istreambuf_iterator<char>());
	auto dat = rom.data();
	char ver[9]{};
	byte cid[8]{};
	int dsum_location = 0;
	word desired_sum = 0;
	word real_sum = 0;
	auto spinit = *(word*)dat;
	enum {
		Unk,
		ESP1,
		ESP2,
		CWX,
		CWII,
	} sum_type{};
	if (spinit == 0xf000) { // cwx or cwii
		if (rom.size() < 0x40000)
		{
			std::cout << "Rom need to be 0x40000 at least.\n";		std::cin.get();
			return 1;
		}
		if (rom.size() == 0x40000) { // must be cwx
			memcpy(ver, &dat[0x3ffee], 8);
			memcpy(cid, &dat[0x3fff8], 8);
			dsum_location = 0x3fff6;
			desired_sum = le_read(dat[0x3fff6]);
			sum_type = CWX;
		}
		else {
			if (rom.size() < 0x60000)
			{
				std::cout << "Rom need to be 0x60000 at least.\n";		std::cin.get();
				return 1;
			}
			if (dat[0x5ffee] == 0xff || dat[0x5ffee] == 0) { // this means... it is stored at 0x71xxx
				if (rom.size() < 0x80000)
				{
					std::cout << "Rom need to be 0x80000 at least.\n";		std::cin.get();
					return 1;
				}
				memcpy(&dat[0x5e000], &dat[0x70000], 0x2000);
			}
			memcpy(ver, &dat[0x5ffee], 8);
			memcpy(cid, &dat[0x5fff8], 8);
			dsum_location = 0x5fff6;
			desired_sum = le_read(dat[0x5fff6]);
			sum_type = CWII;
		}
	}
	else if (spinit == 0x8dfe || spinit == 0x8e00) {
		std::cout << "ES rom dont have checksum!!!\n";
		return 1;
	}
	else if (spinit == 0x8dec || spinit == 0x8df2) {
		if (rom.size() < 0x20000)
		{
			std::cout << "Rom need to be 0x20000 at least.\n";		std::cin.get();
			return 1;
		}
		memcpy(ver, &dat[0x1fff4], 8);
		dsum_location = 0x1fffc;
		desired_sum = le_read(dat[0x1fffc]);
		sum_type = ESP1;
	}
	else if (spinit == 0x8dea) {
		if (rom.size() < 0x20000)
		{
			std::cout << "Rom need to be 0x20000 at least.\n";		std::cin.get();
			return 1;
		}
		memcpy(ver, &dat[0x1fff4], 8);
		dsum_location = 0x1fffc;
		desired_sum = le_read(dat[0x1fffc]);
		sum_type = ESP2;
	}
	// std::cout << sum_type << "\n";
	switch (sum_type)
	{
	case ESP1:
		//calc(real_sum, dat, 0xfc00);
		calc2(real_sum, dat, 0x10000);
		calc2(real_sum, &dat[0x10000], 0xfffc);
		break;
	case ESP2:
		//calc(real_sum, dat, 0xfc00);
		calc2(real_sum, dat, 0x10000);
		calc2(real_sum, &dat[0x10000], 0xff40);
		calc2(real_sum, &dat[0x1ffd0], 0x2c);
		break;
	case CWX:
		calc(real_sum, dat, 0xfc00);
		calc(real_sum, &dat[0x10000], 0x2fff6);
		break;
	case CWII:
		calc(real_sum, dat, 0xfc00);
		calc(real_sum, &dat[0x10000], 0x4fff6);
		break;
	default:
		std::cout << "Unknown sum type!\n";		std::cin.get();
		return 1;
	}
	if (argc > 2) {
		std::ofstream os{ argv[2],std::ios::out | std::ios::binary };
		if (!os)
		{
			std::cout << "Cannot output to \"" << argv[2] << "\"\n";
			std::cin.get();
			return 1;
		}
		le_write(rom[dsum_location], real_sum);
		if (sum_type == CWII) {
			if (rom.size() < 0x80000)
				rom.resize(0x80000, 0);
			memcpy(&rom[0x70000], &rom[0x5e000], 0x2000);
		}
		os.write((const char*)rom.data(), rom.size());
		std::cout << "SUM from "
			<< std::setfill('0') << std::setw(4) << std::uppercase << std::hex << desired_sum
			<< " to "
			<< std::setfill('0') << std::setw(4) << std::uppercase << std::hex << real_sum
			<< "\nSaved!\n";
		std::cin.get();
		return 0;
	}
	else {
		// lets emulate the checksum screen!
		if (sum_type != CWII) {
			char ver_o[0x20] = "123456 Ver00";
			memcpy(ver_o, ver, 6);
			memcpy(ver_o + 10, ver + 6, 2);
			std::cout << ver_o << "\n";
			std::cout << "SUM " << std::setfill('0') << std::setw(4) << std::uppercase << std::hex << real_sum << ((real_sum == desired_sum) ? " OK" : " NG");
			if (sum_type == CWX) {
				std::cout << "\nP00 Read OK\n";
			}
			else {
				if (sum_type == ESP2) {
					std::cout << " ID--";
				}
				std::cout << "\nPd- Read OK\n";
			}
		}
		else {
			char ver_o[0x7]{};
			memcpy(ver_o, ver, 6);
			char ver_o2[0x3]{};
			memcpy(ver_o2, ver + 6, 2);
			std::cout << ver_o << "\n";
			std::cout << "V." << ver_o2 << " Bt OK\n";
			std::cout << "SUM" << std::setfill('0') << std::setw(4) << std::uppercase << std::hex << real_sum << ((real_sum == desired_sum) ? " OK\n" : " NG\n");
		}
		std::cout << "Press AC\n";
		std::cin.get();
		return 	(desired_sum != real_sum);
	}
}

// 运行程序: Ctrl + F5 或调试 >“开始执行(不调试)”菜单
// 调试程序: F5 或调试 >“开始调试”菜单

// 入门使用技巧: 
//   1. 使用解决方案资源管理器窗口添加/管理文件
//   2. 使用团队资源管理器窗口连接到源代码管理
//   3. 使用输出窗口查看生成输出和其他消息
//   4. 使用错误列表窗口查看错误
//   5. 转到“项目”>“添加新项”以创建新的代码文件，或转到“项目”>“添加现有项”以将现有代码文件添加到项目
//   6. 将来，若要再次打开此项目，请转到“文件”>“打开”>“项目”并选择 .sln 文件
