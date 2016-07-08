---
layout: post
category : Python
tags : [Python]
title: Python类型转换、数值操作
---
{% include JB/setup %}
**Python类型转换：**

    函数                    描述  
    int(x [,base ])         将x转换为一个整数  
    long(x [,base ])        将x转换为一个长整数  
    float(x )               将x转换到一个浮点数  
    complex(real [,imag ])  创建一个复数  
    str(x )                 将对象 x 转换为字符串  
    repr(x )                将对象 x 转换为表达式字符串  
    eval(str )              用来计算在字符串中的有效Python表达式,并返回一个对象  
    tuple(s )               将序列 s 转换为一个元组  
    list(s )                将序列 s 转换为一个列表  
    chr(x )                 将一个整数转换为一个字符  
    unichr(x )              将一个整数转换为Unicode字符  
    ord(x )                 将一个字符转换为它的整数值  
    hex(x )                 将一个整数转换为一个十六进制字符串  
    oct(x )                 将一个整数转换为一个八进制字符串  

**Python序列操作：**

    操作                    描述  
    s + r                   序列连接  
    s * n , n * s           s的 n 次拷贝,n为整数  
    s % d                   字符串格式化(仅字符串)  
    s[i]                    索引  
    s[i :j ]                切片  
    x in s , x not in s     从属关系  
    for x in s :            迭代  
    len(s)                  长度  
    min(s)                  最小元素  
    max(s)                  最大元素  
    s[i ] = x               为s[i]重新赋值  
    s[i :j ] = r            将列表片段重新赋值  
    del s[i ]               删除列表中一个元素  
    del s[i :j ]            删除列表中一个片段  

**Python数值操作：**

    x << y                  左移  
    x >> y                  右移  
    x & y                   按位与  
    x | y                   按位或  
    x ^ y                   按位异或 (exclusive or)  
    ~x                      按位翻转  
    x + y                   加  
    x - y                   减  
    x * y                   乘  
    x / y                   常规除  
    x // y                  地板除  
    x ** y                  乘方 (xy )  
    x % y                   取模 (x mod y )  
    -x                      改变操作数的符号位  
    +x                      什么也不做  
    ~x                      ~x=-(x+1)  
    abs(x )                 绝对值  
    divmod(x ,y )           返回 (int(x / y ), x % y )  
    pow(x ,y [,modulo ])    返回 (x ** y ) x % modulo  
    round(x ,[n])           四舍五入，n为小数点位数  
    x < y                   小于  
    x > y                   大于  
    x == y                  等于  
    x != y                  不等于(与<>相同)  
    x >= y                  大于等于  
    x <= y                  小于等于 