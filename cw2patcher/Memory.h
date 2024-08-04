#pragma once
#include <exception>

int hex_char_to_value(char c) {
	if (c >= '0' && c <= '9')
		return c - '0';
	if (c >= 'a' && c <= 'f')
		return c - 'a' + 10;
	if (c >= 'A' && c <= 'F')
		return c - 'A' + 10;
	throw new std::exception("Invalid character in a number.");
}
void parse_byte(const char* pattern, unsigned char* byte, unsigned char* mask) {
	if (pattern[0] == '?' && pattern[1] == '?') {
		*byte = 0;
		*mask = 0;
		return;
	}
	if (pattern[0] == '?') {
		*byte = hex_char_to_value(pattern[1]);
		*mask = 0x0F;
		return;
	}
	if (pattern[1] == '?') {
		*byte = hex_char_to_value(pattern[0]) << 4;
		*mask = 0xF0;
		return;
	}
	int hi = hex_char_to_value(pattern[0]);
	int lo = hex_char_to_value(pattern[1]);
	*byte = (hi << 4) | lo;
	*mask = 0xFF;
	return;
}
const char* skip_spaces(const char* pattern) {
	while (*pattern == ' ') {
		pattern++;
	}
	return pattern;
}
unsigned char* find_pattern(const unsigned char* data, int data_length, const char* pattern) {
	int pattern_length = 0;
	const char* ptr = pattern;

	while (*ptr != '\0') {
		ptr = skip_spaces(ptr);
		if (*ptr != '\0') {
			pattern_length++;
			ptr += 2;
		}
	}

	for (int i = 0; i <= data_length - pattern_length; i++) {
		int match = 1;
		const char* pattern_ptr = pattern;
		for (int j = 0; j < pattern_length; j++) {
			pattern_ptr = skip_spaces(pattern_ptr);
			if (*pattern_ptr == '\0')
				break;

			unsigned char byte, mask;
			parse_byte(pattern_ptr, &byte, &mask);
			if ((data[i + j] & mask) != (byte & mask)) {
				match = 0;
				break;
			}
			pattern_ptr += 2;
		}
		if (match) {
			return (unsigned char*)(data + i);
		}
	}

	return NULL;
}