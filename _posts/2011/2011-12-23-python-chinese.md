---
layout: post
category : Python
tags : [Python, UTF8, GBK, GB2312, ASCII]
title: Python中文处理
---
{% include JB/setup %}
**来自**

**[https://groups.google.com/forum/#!topic/cn.bbs.comp.lang.python/8KO7YrgUVXM/discussion](https://groups.google.com/forum/#!topic/cn.bbs.comp.lang.python/8KO7YrgUVXM/discussion)**

我来讲一下字符问题我的理解吧，虽然我对Python的编码处理的具体细节还不太清楚，不过临时稍微看了一下，和Perl的原理也差不多。

最重要的是必须区分“字符”和“字节”的不同，“字符”是抽象的，而“字节”是具体的。

比如一个“中”字，在不同编码中用如下字节表示： 

       GBK      Big5        UTF-8     UTF-16LE 
    \xD6\xD0  \xA4\xA4  \xE4\xB8\xAD  \x2D\x4E 

所谓“抽象”的“字符”的“中”，并不是指“\xD6\xD0”或“\xA4\xA4”或任何字节，应该把它理解成：GBK编码中“\xD6\xD0”字节所指代的那个字符（语言学中的能指→所指），或者UTF-8编码中“\xE4\xB8\xAD”所指代的那个字符，但并不是这些具体字节本身。

问题是，抽象的字符要作为数据进行存储和传递，就必须有具体的形式，也就是说你在程序内部实现中，要存储“中”这个字符，你必须采用某些特定的字节。你可以用“\xD6\xD0”，也可以用“\xE4\xB8\xAD”，也可以用“\x2D\x4E”，Python在Windows下采用的是UTF-16LE(?)，也就意味着它的“字符”的载体编码是UTF-16LE。

    sys.setdefaultencoding(name) 
    Set the current default string encoding used by the Unicode implementation. 

文档上是这么写的，如果我的理解没错的话，这个函数的作用就是改变“字符”的载体编码，sys.setdefaultencoding('gbk')以后，“中”这个字符在程序内部就不是用“\x2D\x4E”来承载，而是用“\xD6\xD0”来承载了。

Python2.x里的str和unicode有什么区别呢？从字面意义上看容易混淆，实际上，你可以把它理解成str是“字节串”，unicode是“字符串”（string总是翻译成“字符串”，在这里就很容易把人绕晕），看下面的例子： 

    # -*- coding: gb2312 -*- 

    s = "张三李四" 
    print len(s) # => 8 
    u = s.decode('gbk') 
    print len(u) # => 4 

我的脚本编码用的是GBK，而不是UTF-8，你会看到len(s)是8，这是这四个汉字所用的实际8个“字节”，而len(u)是4，这就表示这里有4个“字符” 。

encode和decode是什么意思呢？所谓编码，就是把意义转换成符号；而解码，就是把符号还原成意义。在这里，encode应该理解成把抽象的字符转换成具体的字节，而decode是把具体的字节还原成抽象的字符。

现在的问题是：str类和unicode类都同时具有encode和decode方法，这是一个让我很不以为然的设定。如果按照字节与字符的区分，encode方法是应该只归unicode类所有，decode方法是只归str类所有的，因为“意义”只能转换成“符号”，“意义”再还原成“意义”这本身就没有意义。 

假如我们这样： 

    # -*- coding: gb2312 -*- 

    s = "张三李四" 
    u = s.decode('gbk') # 没问题，字节解码为字符，符号还原为意义 
    s2 = s.encode('gbk') 
    # 出错了！字节没法再编码成字节，除非s全部是ASCII字符，但是这样s2和s是完全等同的，这个操作有什么意义？ 
    u2 = u.decode('gbk') 
    # 又出错了！也只能u只包含ASCII字符，u2和u也是完全等同，这个操作也没有意义 

在这里提一下Perl的处理方式，我不知道Python处理编码的原理是否是直接得自Python，还是说这是各门语言共同的做法（但是Ruby又不是这样做的），总之Python2.x是有缺陷的。

Perl里只有一种string，它实际也区分字符串和字节串（以UTF-8作为底层的承载编码），但不像Python2.x分str和unicode，而是string内部有一个utf8的flag，这个flag是on的时候，这个string就是一个“字符”串，这个flag是off的时候就是一个“字节”串，它的编码、解码函数如下： 

    $octets = encode(ENCODING, $string [, CHECK]) 

    $string = decode(ENCODING, $octets [, CHECK]) 

$octets就是字节串，$string就是字符串，也就是说，encode只对$string起作用，而decode只对$octets起作用，不像Python是str和unicode两类两个方法都有，但是其实各有一个是没用的。Larry Wall是语言学家，他设计的这一套字符、字节关系是完全符合语言学中的“能指-所指”理论的，而GvR恐怕就对语言学不在行了，Python的处理就不怎么精妙了。 

再来说一下file.write为什么有编码问题： 

    # -*- coding: gb2312 -*- 

    s = "张三李四" 
    u = s.decode('gbk') 

    f = open('text.txt','w') 
    f.write(u) # 出错！ 
    f.write(u.encode('gbk')) # 这样才行 

出错的原因很简单，你想输出的是“字符”，而不是“字节”。上面说过，“字符”是抽象的，你是没有办法把一个抽象的东西写到文件里去的。虽然抽象的字符下面肯定是有具体的承载字节的，但是Python似乎并不愿意把unicode底层的字节跟IO搅在一起，这就导致f.write(a_unicode)的失败，当然a_unicode假如只包含ASCII字符，这个可以成功，然而这是一种捷径，是一条让人越来越糊涂的捷径。

然后再是u标记的意义是什么？很简单，就是自动完成字节→字符的转换 

    # -*- coding: gb2312 -*- 

    s_or_u1 = "张三李四" 
    print type(s_or_u1) # => <type 'str'> 

    s_or_u2 = u"张三李四" 
    print type(s_or_u2) # => <type 'unicode'> 

u"张三李四"就相当于"张三李四".decode(a_enc)，这里的a_enc就是#coding行设定的gb2312。

不得不说，（不知是不是从Perl得来的）这套字符处理方式很晦涩，字符、字节区分的概念实在不太容易理解，而Python本身的细节处理也没有做好，Perl做得很干净了，都不容易理解，Python没做干净更不行了。


**另外再附赠简单介绍Ruby的字符处理方式，跟Perl完全不同： **

Ruby中没有字符、字节的区分，一切字符串都是“带有一个编码属性的字节串”。因为没有抽象的字符，所以就没有字节→字符的转换，也就根本没有、也不需要decode方法，Ruby的String类只有encode方法。因为没有抽象的“字符”概念，Ruby的编码问题应该比Perl、Python容易理解。

没有“字符”的还有一个好处是：处理多字节文本无需经过中间转换。你要在Perl里处理中文字符，来源文件是GBK编码的，实际都得先转换成UTF-8，Perl才能处理，Python要先转化成UTF-16才能处理。对于海量文本来说，这一转换过程肯定是要耗费一定的资源的。而Ruby不需要这种转换，直接就能处理GBK或其他编码了。可能这样做也是考虑了日文的实际，日文的shift-jis(?)是本土编码，根本都不跟ASCII兼容，不像GBK是跟ASCII兼容的，这样做就不必转换就能处理土著编码的文档了。如果说Perl的字符-字节区分是语言学家的学院派做法的话，Ruby就是契合了多字节字符处理需要的实用派做法。 