---
layout: post
category : Python
tags : [BeautifulSoup]
title: BeautifulSoup解析中文网页乱
---
{% include JB/setup %}

**来自：[http://leeon.me/a/beautifulsoup-chinese-page-resolve](http://leeon.me/a/beautifulsoup-chinese-page-resolve)**

	import urllib2
	from BeautifulSoup import BeautifulSoup

	page = urllib2.urlopen('http://www.leeon.me');
	soup = BeautifulSoup(page,fromEncoding="gb18030")

	print soup.originalEncoding
	print soup.prettify()

如果中文页面编码是gb2312，gbk，在BeautifulSoup构造器中传入fromEncoding="gb18030"参数即可解决乱码问题，即使分析的页面是utf8的页面使用gb18030也不会出现乱码问题！

**原因如下：**

微软将 gb2312 和 gbk 映射为 gb18030，方便了一些人，也迷惑了一些人。

[https://groups.google.com/forum/?fromgroups=#!topic/python-cn/y0GM6BFWNSQ](https://groups.google.com/forum/?fromgroups=#!topic/python-cn/y0GM6BFWNSQ)