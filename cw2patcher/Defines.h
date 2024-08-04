﻿#pragma once
#include <cmath>
#include <concepts>
#include <filesystem>
#include <string>
#include <vector>

template <class T>
struct Vector {
	T X = T{};
	T Y = T{};
#ifdef _MSC_VER
	inline T GetX() {
		return X;
	}
	inline T SetX(T x) {
		return X = x;
	}
	inline T GetY() {
		return Y;
	}
	inline T SetY(T y) {
		return Y = y;
	}
	__declspec(property(get = GetX, put = SetX)) T x;
	__declspec(property(get = GetY, put = SetY)) T y;
#endif
	auto Length() {
		return sqrt(X * X + Y * Y);
	}
	auto SquaredLength() {
		return X * X + Y * Y;
	}
	Vector operator+(Vector b) {
		return { X + b.X, Y + b.Y };
	}
	Vector operator-(Vector b) {
		return { X - b.X, Y - b.Y };
	}
	Vector operator*(T b) {
		return { X * b, Y * b };
	}
	Vector operator/(T b) {
		return { X / b, Y / b };
	}
	T DotProduct(Vector b) {
		return X * b.X + Y * b.Y;
	}
	T CrossProduct(Vector b) {
		return X * b.Y - Y * b.X;
	}
	void Normalize() {
		T len = Length();
		X /= len;
		Y /= len;
	}
	void Rotate(double angle) {
		T newX = X * cos(angle) - Y * sin(angle);
		T newY = X * sin(angle) + Y * cos(angle);
		X = newX;
		Y = newY;
	}
	bool operator==(Vector b) const {
		return X == b.X && Y == b.Y;
	}

	bool operator!=(Vector b) const {
		return !(*this == b);
	}

	bool operator<(Vector b) const {
		return Length() < b.Length();
	}

	bool operator>(Vector b) const {
		return Length() > b.Length();
	}

	bool operator<=(Vector b) const {
		return Length() <= b.Length();
	}

	bool operator>=(Vector b) const {
		return Length() >= b.Length();
	}
};
template <class T>
struct Point {
	friend Vector<T>;
	Point() {}
	Point(T X, T Y) : X(X), Y(Y) {}
	Point(const Vector<T> vec) : X(vec.X), Y(vec.Y) {
	}
	T X = T{};
	T Y = T{};
#ifdef _MSC_VER
	inline T GetX() {
		return X;
	}
	inline T SetX(T x) {
		return X = x;
	}
	inline T GetY() {
		return Y;
	}
	inline T SetY(T y) {
		return Y = y;
	}
	__declspec(property(get = GetX, put = SetX)) T x;
	__declspec(property(get = GetY, put = SetY)) T y;
#endif

	auto Length() {
		return sqrt(X * X + Y * Y);
	}
	auto SquaredLength() {
		return X * X + Y * Y;
	}
	Point operator+(Point b) {
		return { X + b.X, Y + b.Y };
	}
	Point operator-(Point b) {
		return { X - b.X, Y - b.Y };
	}
	Point operator*(T b) {
		return { X * b, Y * b };
	}
	Point operator/(T b) {
		return { X / b, Y / b };
	}
	operator Vector<T>() const {
		return { X, Y };
	}
	bool operator==(Point b) const {
		return X == b.X && Y == b.Y;
	}

	bool operator!=(Point b) const {
		return !(*this == b);
	}
};
using PointD = Point<double>;
using VectorD = Vector<double>;
using PointI = Point<int>;
using VectorI = Vector<int>;

#include <numeric>
inline double variance(double mean, const std::vector<double>& values) {
	if (values.size() < 2)
		return 0;

	auto sq_diff_sum = std::accumulate(values.begin(), values.end(), 0.0,
		[mean](double sum, double val) {
			double diff = val - mean;
			return sum + diff * diff;
		});

	return sq_diff_sum / (values.size() - 1);
}
template <class T>
class zero {
public:
	static constexpr T val = T();
};
template <>
class zero<double> {
public:
	static constexpr double val = 1e-15;
};
template <>
class zero<float> {
public:
	static constexpr float val = 1e-9f;
};
template <class T>
constexpr T zero_v = zero<T>::val;

using Hash = unsigned int;
using path = std::filesystem::path;
using string = std::string;
using ulonglong = unsigned long long;

#define QUOTE_S(x) #x
#define QUOTE(x) QUOTE_S(x)
#ifdef __clang__
#define __FUNCTION__ "CLANG_COMPILED_MAGIC"
#endif // __clang__

#define Assert(x)                                                                                             \
	{                                                                                                         \
		if (!(x))                                                                                             \
			throw std::exception("Assertion at function " __FUNCTION__ "(Line " QUOTE(__LINE__) ") failed."); \
	}
template <std::integral T>
std::string Hex(T n) {
	constexpr auto digits = sizeof(T) * 2;
	std::string hexString(digits, '0');
	const char hexChars[] = "0123456789abcdef";
	for (size_t i = 0; i < digits; i++) {
		hexString[digits - i -1] = hexChars[n & 0xF];
		n >>= 4; // 位右移 4 位相当于除以 16
	}
	return hexString;
}
