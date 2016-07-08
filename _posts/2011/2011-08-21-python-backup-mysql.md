---
layout: post
category : Python
tags : [Python, MySQL]
title: Windows上Python备份MySQL脚本
---
{% include JB/setup %}

**Windows上Python备份MySQL脚本**
稍微修改就可以变成
**Linux上Python备份MySQL脚本**
或者
**Unix上Python备份MySQL脚本**

    #!/usr/bin/env python
    #encoding=utf-8 

    #Name    : mysql_backup.py
    #Author  : Chaous Nie
    #Mail    : chaous@sar4.com
    #Site    : http://sar4.com
    #Time    : 2011-08-20
    #For     : Backup mysql databases on windows
    #Version : 0.1.2 Beta
    #Steps   :
    # 1.backup databases match  filter
    # 2.gzip backup
    # 3.md5sum backup
    # 4.delete backup before $keeptime days ago
    # 5.if isftp==1 then upload backup to ftp server

    import os, sys , re, string, gzip, md5, getpass
    from ftplib import FTP
    from datetime import datetime,timedelta

    reload(sys)
    sys.setdefaultencoding('utf-8')

    #mysql related
    backup_path = '''e:\\\\backup\\'''
    dbhost = "localhost"
    dbuser = "backup"
    dbpass = "080808"
    dumpoptions = '''--default_character-set=utf8 --triggers --routines --hex-blob --master-data=2 --single-transaction --flush-logs'''
    filter = re.compile('^test(.*)$')
    keeptime = (7)

    #ftp related
    isftp = 1
    ftphost = '10.10.10.10'
    ftpuser = 'user'
    ftppass = 'passwd'
    ftpport = '21'
    ftppath ='''/ftp'''

    nowdate = datetime.now().strftime('%Y%m%d')

    def find_db():
        if os.path.isdir('''%s''' % (backup_path)):
            pass
        else:
            os.mkdir('''%s''' % (backup_path))

        find_command = '''mysql -h%s -u%s -p%s -e"show databases" > %sfind_db.list\n ''' % (dbhost, dbuser, dbpass, backup_path) 

        a, b = os.popen2('cmd')
        a.write(find_command)
        a.close()
        b.read()
        b.close()

    def sum(*files):
        sts = 0
        if files and isinstance(files[-1], file):
            files = files[-1], files[:-1]
        if len(files) == 1 and not isinstance(files[0], str):
            files = files[0]
        for f in files:
            if isinstance(f, str):
                if f == '-':
                    sts = printsumfp(sys.stdin, '<stdin>') or sts
                else:
                    sts = printsum(f) or sts
            else:
                sts = sum(f) or sts
        return sts

    def printsum(filename):
        try:
            fp = open(filename, 'rb')
        except IOError, msg:
            sys.stderr.write('%s: Can\'t open: %s\n' % (filename, msg))
            return 1
        sts = printsumfp(fp, filename)
        fp.close()
        return sts

    def printsumfp(fp, filename):
        m = md5.new()
        try:
            while 1:
                data = fp.read(8096)
                if not data:
                    break
                m.update(data)
        except IOError, msg:
            sys.stderr.write('%s: I/O error: %s\n' % (filename, msg))
            return 1
        return ('%s  %s' % (m.hexdigest(), filename))

    def gzip_db(db):
        dbname=db
        gzip_in = open('%s\%s\%s_%s.sql' % (backup_path, dbname, dbname, nowdate) , 'rb')
        gzip_out = gzip.open('%s/%s/%s_%s.sql.gz' % (backup_path, dbname, dbname, nowdate) , 'wb')
        gzip_out.writelines(gzip_in)
        gzip_out.close()
        gzip_in.close()
        os.remove('%s\%s\%s_%s.sql' % (backup_path, dbname, dbname, nowdate))

    def backup_db(db):
        dbname=db
        if os.path.isdir('''%s\%s''' % (backup_path, dbname)):
            pass
        else:
            os.mkdir('''%s\%s''' % (backup_path, dbname))
        backup_command = '''mysqldump -h%s -u%s -p%s %s %s > %s\%s\%s_%s.sql\n''' % (dbhost, dbuser, dbpass, dumpoptions, dbname, backup_path, dbname, dbname, nowdate)
        print '''mysqldump -h%s -u%s -p%s %s %s > %s\%s\%s_%s.sql''' % (dbhost, dbuser, dbpass, dumpoptions, dbname, backup_path, dbname, dbname, nowdate)
        a, b = os.popen2('cmd')
        a.write(backup_command)
        a.close()
        b.read()
        b.close() 

    def ftp_backup(db):
        dbname=db
        localgzip = '''%s\%s\%s_%s.sql.gz''' % (backup_path, dbname, dbname, nowdate)
        localmd5 = '''%s\%s\%s_%s.sql.gz.MD5''' % (backup_path, dbname, dbname, nowdate)

        try:
            ftp =FTP()
            ftp.connect(ftphost,ftpport)
            ftp.login(ftpuser,ftppass)
            print "Welcome:",ftp.getwelcome()
        except Exception,e:
            print e
        else:
            try:
                ftp.cwd('''%s/%s''' %(ftppath,dbname))
            except Exception,e:
                print e
                print '''mkdir %s/%s''' %(ftppath,dbname)
                ftp.mkd('''%s/%s''' %(ftppath,dbname))
                ftp.cwd('''%s/%s''' %(ftppath,dbname))

            fd = open(localgzip,'rb')
            ftp.storbinary('STOR %s' % os.path.basename(localgzip),fd)
            fd.close()

            fd = open(localmd5,'rb')
            ftp.storbinary('STOR %s' % os.path.basename(localmd5),fd)
            fd.close()

            ftp.retrlines('LIST')

            ftp.quit()

    def del_backup(db):
        dbname=db
        now = datetime.now()
        old = now - timedelta(keeptime)
        olddate = old.strftime('%Y%m%d')
        exist=os.path.exists('%s\%s\%s_%s.sql.gz' % (backup_path, dbname, dbname, olddate))
        if exist :
            os.remove('%s\%s\%s_%s.sql.gz' % (backup_path, dbname, dbname, olddate))
            print '''delete %s_%s.sql.gz''' % (dbname,olddate)
        exist=os.path.exists('%s\%s\%s_%s.sql.gz.MD5' % (backup_path, dbname, dbname, olddate))
        if exist :
            os.remove('%s\%s\%s_%s.sql.gz.MD5' % (backup_path, dbname, dbname, olddate))
            print '''delete %s_%s.sql.gz.MD5''' % (dbname,olddate)

    def md5sum(gzipfile,db):
        md5info = sum(gzipfile)
        print md5info
        md5file = open('%s.MD5' % (gzipfile) , 'w')
        md5file.write(md5info)
        md5file.close()

    def main():
        find_db()

        dbs=open(backup_path+'find_db.list','r')
        for line in dbs.readlines():
            line = line.strip('\n')
            db = filter.match(line)
            if db:
                db = db.group(0)
                backup_db(db)
                gzip_db(db)
                gzipfile = '''%s\%s\%s_%s.sql.gz''' % (backup_path, db, db, nowdate)
                md5sum(gzipfile,db)
                print '''dumped database %s as %s\%s\%s_%s.sql.gz''' % (db,backup_path, db, db, nowdate)
                del_backup(db)
        dbs.close()

        if isftp == 1:
            dbs=open(backup_path+'find_db.list','r')
            for line in dbs.readlines():
                line = line.strip('\n')
                db = filter.match(line)
                if db:
                    db = db.group(0)
                    ftp_backup(db)
            dbs.close()

        os.remove(backup_path+'find_db.list')

    if __name__ == '__main__':
        main()