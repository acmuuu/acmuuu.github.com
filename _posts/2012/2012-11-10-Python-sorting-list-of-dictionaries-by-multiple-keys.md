---
layout: post
category : Python
tags : [Python]
title: Python根据列表中的字典多个key进行排序
---
{% include JB/setup %}
**参考[http://stackoverflow.com/questions/1143671/python-sorting-list-of-dictionaries-by-multiple-keys](http://stackoverflow.com/questions/1143671/python-sorting-list-of-dictionaries-by-multiple-keys)**

如下脚步中，对列表la中的字典元素按照xianshou倒序排列，之后按照minjie顺序排列

    r1={'gongji':50,'fangyu':5,'baoji':1,'bisha':1,'shanbi':1,'fanji':1,'shengming':660,'xianshou':8,'minjie':100,'name':'r1'}
    r2={'gongji':51,'fangyu':4,'baoji':1,'bisha':1,'shanbi':1,'fanji':1,'shengming':260,'xianshou':5,'minjie':90,'name':'r2'}
    r3={'gongji':53,'fangyu':8,'baoji':1,'bisha':1,'shanbi':1,'fanji':3,'shengming':100,'xianshou':3,'minjie':95,'name':'r3'}
    r4={'gongji':51,'fangyu':4,'baoji':1,'bisha':1,'shanbi':1,'fanji':2,'shengming':500,'xianshou':8,'minjie':120,'name':'r4'}
    r5={'gongji':53,'fangyu':8,'baoji':1,'bisha':1,'shanbi':1,'fanji':3,'shengming':200,'xianshou':9,'minjie':200,'name':'r5'}
    r6={'gongji':54,'fangyu':4,'baoji':1,'bisha':1,'shanbi':1,'fanji':2,'shengming':50,'xianshou':4,'minjie':80,'name':'r6'}

    la=[r1,r2,r3,r4,r5,r6]

    # func 1
    def sortkeypicker(keynames):
        negate = set()
        for i, k in enumerate(keynames):
            if k[:1] == '-':
                keynames[i] = k[1:]
                negate.add(k[1:])
        def getit(adict):
           composite = [adict[k] for k in keynames]
           for i, (k, v) in enumerate(zip(keynames, composite)):
               if k in negate:
                   composite[i] = -v
           return composite
        return getit

    a = sorted(la, key=sortkeypicker(['-xianshou', 'minjie']))

    for i in a:
        print i

    print

    # func 2
    def multikeysort(items, columns):
        from operator import itemgetter
        comparers = [ ((itemgetter(col[1:].strip()), -1) if col.startswith('-') else (itemgetter(col.strip()), 1)) for col in columns]  
        def comparer(left, right):
            for fn, mult in comparers:
                result = cmp(fn(left), fn(right))

                if result:
                    return mult * result
            else:
                return 0

        return sorted(items, cmp=comparer)

    b = multikeysort(la, ['-xianshou', 'minjie'])

    for i in b:
        print i

    print

    # func 3
    from operator import itemgetter
    c = sorted(la, key=itemgetter("minjie"))
    c = sorted(c, key=itemgetter("xianshou"), reverse=True)

    for i in c:
        print i

    print

    # func 4
    d = sorted(la, key=lambda d: (-d['xianshou'], d['minjie']))

    for i in d:
        print i

    print

    # func 5
    from operator import itemgetter
    from functools import partial

    def _neg_itemgetter(key, d):
        return -d[key]

    def key_getter(key_expr):
        keys = key_expr.split(",")
        getters = []
        for k in keys:
            k = k.strip()
            if k.startswith("-"):
               getters.append(partial(_neg_itemgetter, k[1:]))
            else:
               getters.append(itemgetter(k))

        def keyfunc(dct):
            return [kg(dct) for kg in getters]

        return keyfunc

    def multikeysort2(dict_list, sortkeys):
        return sorted(dict_list, key = key_getter(sortkeys))

    e = multikeysort2(la,"-xianshou,minjie")

    for i in e:
        print i

    print

执行结果如下

    [root@scdx3-93 tmp]# /usr/local/python27/bin/python2.7 sort.py 
    {'baoji': 1, 'shanbi': 1, 'gongji': 53, 'minjie': 200, 'xianshou': 9, 'name': 'r5', 'fanji': 3, 'bisha': 1, 'fangyu': 8, 'shengming': 200}
    {'baoji': 1, 'shanbi': 1, 'gongji': 50, 'minjie': 100, 'xianshou': 8, 'name': 'r1', 'fanji': 1, 'bisha': 1, 'fangyu': 5, 'shengming': 660}
    {'baoji': 1, 'shanbi': 1, 'gongji': 51, 'minjie': 120, 'xianshou': 8, 'name': 'r4', 'fanji': 2, 'bisha': 1, 'fangyu': 4, 'shengming': 500}
    {'baoji': 1, 'shanbi': 1, 'gongji': 51, 'minjie': 90, 'xianshou': 5, 'name': 'r2', 'fanji': 1, 'bisha': 1, 'fangyu': 4, 'shengming': 260}
    {'baoji': 1, 'shanbi': 1, 'gongji': 54, 'minjie': 80, 'xianshou': 4, 'name': 'r6', 'fanji': 2, 'bisha': 1, 'fangyu': 4, 'shengming': 50}
    {'baoji': 1, 'shanbi': 1, 'gongji': 53, 'minjie': 95, 'xianshou': 3, 'name': 'r3', 'fanji': 3, 'bisha': 1, 'fangyu': 8, 'shengming': 100}

    {'baoji': 1, 'shanbi': 1, 'gongji': 53, 'minjie': 200, 'xianshou': 9, 'name': 'r5', 'fanji': 3, 'bisha': 1, 'fangyu': 8, 'shengming': 200}
    {'baoji': 1, 'shanbi': 1, 'gongji': 50, 'minjie': 100, 'xianshou': 8, 'name': 'r1', 'fanji': 1, 'bisha': 1, 'fangyu': 5, 'shengming': 660}
    {'baoji': 1, 'shanbi': 1, 'gongji': 51, 'minjie': 120, 'xianshou': 8, 'name': 'r4', 'fanji': 2, 'bisha': 1, 'fangyu': 4, 'shengming': 500}
    {'baoji': 1, 'shanbi': 1, 'gongji': 51, 'minjie': 90, 'xianshou': 5, 'name': 'r2', 'fanji': 1, 'bisha': 1, 'fangyu': 4, 'shengming': 260}
    {'baoji': 1, 'shanbi': 1, 'gongji': 54, 'minjie': 80, 'xianshou': 4, 'name': 'r6', 'fanji': 2, 'bisha': 1, 'fangyu': 4, 'shengming': 50}
    {'baoji': 1, 'shanbi': 1, 'gongji': 53, 'minjie': 95, 'xianshou': 3, 'name': 'r3', 'fanji': 3, 'bisha': 1, 'fangyu': 8, 'shengming': 100}

    {'baoji': 1, 'shanbi': 1, 'gongji': 53, 'minjie': 200, 'xianshou': 9, 'name': 'r5', 'fanji': 3, 'bisha': 1, 'fangyu': 8, 'shengming': 200}
    {'baoji': 1, 'shanbi': 1, 'gongji': 50, 'minjie': 100, 'xianshou': 8, 'name': 'r1', 'fanji': 1, 'bisha': 1, 'fangyu': 5, 'shengming': 660}
    {'baoji': 1, 'shanbi': 1, 'gongji': 51, 'minjie': 120, 'xianshou': 8, 'name': 'r4', 'fanji': 2, 'bisha': 1, 'fangyu': 4, 'shengming': 500}
    {'baoji': 1, 'shanbi': 1, 'gongji': 51, 'minjie': 90, 'xianshou': 5, 'name': 'r2', 'fanji': 1, 'bisha': 1, 'fangyu': 4, 'shengming': 260}
    {'baoji': 1, 'shanbi': 1, 'gongji': 54, 'minjie': 80, 'xianshou': 4, 'name': 'r6', 'fanji': 2, 'bisha': 1, 'fangyu': 4, 'shengming': 50}
    {'baoji': 1, 'shanbi': 1, 'gongji': 53, 'minjie': 95, 'xianshou': 3, 'name': 'r3', 'fanji': 3, 'bisha': 1, 'fangyu': 8, 'shengming': 100}

    {'baoji': 1, 'shanbi': 1, 'gongji': 53, 'minjie': 200, 'xianshou': 9, 'name': 'r5', 'fanji': 3, 'bisha': 1, 'fangyu': 8, 'shengming': 200}
    {'baoji': 1, 'shanbi': 1, 'gongji': 50, 'minjie': 100, 'xianshou': 8, 'name': 'r1', 'fanji': 1, 'bisha': 1, 'fangyu': 5, 'shengming': 660}
    {'baoji': 1, 'shanbi': 1, 'gongji': 51, 'minjie': 120, 'xianshou': 8, 'name': 'r4', 'fanji': 2, 'bisha': 1, 'fangyu': 4, 'shengming': 500}
    {'baoji': 1, 'shanbi': 1, 'gongji': 51, 'minjie': 90, 'xianshou': 5, 'name': 'r2', 'fanji': 1, 'bisha': 1, 'fangyu': 4, 'shengming': 260}
    {'baoji': 1, 'shanbi': 1, 'gongji': 54, 'minjie': 80, 'xianshou': 4, 'name': 'r6', 'fanji': 2, 'bisha': 1, 'fangyu': 4, 'shengming': 50}
    {'baoji': 1, 'shanbi': 1, 'gongji': 53, 'minjie': 95, 'xianshou': 3, 'name': 'r3', 'fanji': 3, 'bisha': 1, 'fangyu': 8, 'shengming': 100}

    {'baoji': 1, 'shanbi': 1, 'gongji': 53, 'minjie': 200, 'xianshou': 9, 'name': 'r5', 'fanji': 3, 'bisha': 1, 'fangyu': 8, 'shengming': 200}
    {'baoji': 1, 'shanbi': 1, 'gongji': 50, 'minjie': 100, 'xianshou': 8, 'name': 'r1', 'fanji': 1, 'bisha': 1, 'fangyu': 5, 'shengming': 660}
    {'baoji': 1, 'shanbi': 1, 'gongji': 51, 'minjie': 120, 'xianshou': 8, 'name': 'r4', 'fanji': 2, 'bisha': 1, 'fangyu': 4, 'shengming': 500}
    {'baoji': 1, 'shanbi': 1, 'gongji': 51, 'minjie': 90, 'xianshou': 5, 'name': 'r2', 'fanji': 1, 'bisha': 1, 'fangyu': 4, 'shengming': 260}
    {'baoji': 1, 'shanbi': 1, 'gongji': 54, 'minjie': 80, 'xianshou': 4, 'name': 'r6', 'fanji': 2, 'bisha': 1, 'fangyu': 4, 'shengming': 50}
    {'baoji': 1, 'shanbi': 1, 'gongji': 53, 'minjie': 95, 'xianshou': 3, 'name': 'r3', 'fanji': 3, 'bisha': 1, 'fangyu': 8, 'shengming': 100}
