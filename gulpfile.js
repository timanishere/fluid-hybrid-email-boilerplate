/******************************************************************
 * GENERAL EMAIL GULP TEMPLATE
 *
 * Run `gulp` to run dev.
 * Run `gulp dist` to generate just the distilled version.
 * Run `gulp web` to generate inlined email and web versions.
 * 
 * Currently uses premailer (and thus Ruby gems).
 ******************************************************************/






//////////////////////////////
//        VARIABLES         //
//////////////////////////////

    // SOFA UTM:
    // A hacky way of dealing with UTM tags.
    // Link format:     <a id="l[0-9]*" href="http://www.sofa.com/[^"]

    // If an @@include module is repeated, you may run into the problem where a URL has
    // the UTM tag inserted multiple times into the same link.
    // To get around this issue, you can:
    //      1. Use "http://www.sofa.com//" to differentiate the sofa.com link from others.
    //         Without this, http://www.sofa.com/about-us/why-us would be:
    //              http://www.sofa.com/?UTMTAGS/aboutus/whyus
    //         With this method, there can be a few issues where an @@include section is
    //         repeated and the link address is the same. In that case, you'll want to...
    //      2. Go in and manually change the id's for each link.
    //         This is the safest option.

    // You can turn off utm or adjust by changing variables below:
    var utm = {
        use:        false,
        regex:      /<a id="l[0-9]*" href="http:\/\/www.sofa.com[^"]*/g,
        source:     "newsletter",
        medium:     "email",
        campaign:   "October_GSP",
        tag:        function() {
            return "utm_source=" + this.source + "&utm_medium=" + this.medium + "&utm_campaign=" + this.campaign
        }
    }

    // For naming the web-version email.
    // If you delete the string, it will default to index.html
    var campaign = {
        name:       ""
    }





//////////////////////////////
//      INITIALIZATION      //
//////////////////////////////

    // Include gulp and plugins
    var gulp = require('gulp'),
        p = require('gulp-load-plugins')();

    var fileinclude = require('gulp-file-include'),
        sass = require('gulp-sass'),
        targetHTML = require('gulp-targethtml'),
        prettify = require('gulp-html-prettify'),
        runSequence = require('run-sequence'),
        gulpif = require('gulp-if');

    // Paths
    var basePaths = {
        dist:   'dist' + getTheDate() + '/',
        src:    'src/'
    };

    var paths = {
        images: {
            src: basePaths.src + 'img',
            dest:basePaths.dist + 'img'
        },
        email:  {
            src: basePaths.src + 'email.html',
            dist:basePaths.dist + 'email.html',
            tmp: basePaths.src + '_tmp.email.html',
            web: basePaths.dist + ((campaign.name.length > 0) ? (campaign.name + '.html') : 'index.html')
        },
        scss:   {
            src: basePaths.src + 'scss/**/*.scss',
            dest:basePaths.src + 'css/',
            dist:basePaths.dist + 'css/'
        },
        html:   basePaths.src + 'html/**/*.html'
    }

    var domains = {
        dist:   '',
        dev:    'http://localhost:8000/'
    };

    // Task options
    var dev = true,
        web = false;

    // Helper Function
    function getTheDate() {
        var d = new Date();
        var yr = d.getFullYear().toString();
        var mo = zeroPad((d.getMonth() + 1).toString());
        var da = zeroPad((d.getDate()).toString());
        return yr.concat(mo,da);
    };

    function zeroPad(str) {
        return ("00" + str).slice(-2);
    };





//////////////////////////////
//          TASKS           //
//////////////////////////////

    /**
     * CLEAN - Cleanup tasks
     * ========================================
     * https://www.npmjs.org/package/gulp-clean
     */
    gulp.task('clean', function() {
        return gulp.src( basePaths.dist.concat('*'), {
            read: false
        })
            .pipe(p.clean());
    });

    /**
     * SASS - SCSS compilation
     * ========================================
     */
    gulp.task('sass', function() {
    	return gulp.src( paths.scss.src )
    		.pipe(sass())
    		.pipe(gulp.dest( dev ? paths.scss.dest : paths.scss.dist ));
    });

    /**
     * FILE-INCLUDER - including external html
     * ========================================
     */
    gulp.task('fileinclude', function() {
        return gulp.src( web ? [ paths.email.web, paths.email.src ] : paths.email.src )
            .pipe(fileinclude({
                prefix: '@@',
                basepath: './src'
            }))
            .pipe( gulpif(dev, p.rename('_tmp.email.html')) )
            .pipe(gulp.dest( dev ? basePaths.src : basePaths.dist ));
    });

    /**
     * CONNECT - Start up a webserver for dev
     * ========================================
     */
    gulp.task('webserver', function() {
        return gulp.src('.')
            .pipe(p.webserver({
                livereload: true,
                port: 8000,
                open: paths.email.tmp
            }));
    });

    /**
     * PREMAILER - uses ruby gems to inline
     * ========================================
     */
    gulp.task('premailer', function() {
        return gulp.src( basePaths.dist.concat('*.html') )
            .pipe(p.premailer())
            .pipe(gulp.dest( basePaths.dist ));
    });

    /**
     * PRETTIFY - properly indent HTML
     * ========================================
     */
    gulp.task('prettify', function() {
        return gulp.src( web ? [ paths.email.dist, paths.email.web ] : (dev ? paths.email.tmp : paths.email.dist) )
            .pipe(prettify({indent_char: ' ', indent_size: 2}))
            .pipe(gulp.dest( dev ? basePaths.src : basePaths.dist ))
    });

    /**
     * REPLACE - remove ET tracking tag
     * ========================================
     */
    gulp.task('replace', function() {
        return gulp.src( paths.email.src )
            .pipe(p.replace('<custom name="opencounter" type="tracking">', ''))
            .pipe(p.rename((campaign.name.length > 0) ? (campaign.name + '.html') : 'index.html'))
            .pipe(gulp.dest( basePaths.dist ));
    });

    /**
     * TARGET-HTML - replace certain html
     * ========================================
     */
    gulp.task('target-html', function() {
        return gulp.src( paths.email.web )
            .pipe(targetHTML('web'))
            .pipe(gulp.dest( basePaths.dist ));
    });

    /**
     * UTM - add UTM tags to links
     * ========================================
     */
    gulp.task('utm', function() {
        return gulp.src( dev ? paths.email.tmp : ( web ? [ paths.email.dist, paths.email.web ] : paths.email.dist ) )
            .pipe(gulpif(utm.use, p.edit( function (src, cb) {
                var links = src.match(utm.regex);
                if (links != null) {
                    for (n = 0; n < links.length; n++) {
                        if (links[n].search('com//') != -1) {
                            src = src.replace(links[n], links[n].substring(0,links[n].length-1).concat('?', utm.tag()));
                        } else if (links[n].search(/\?/) != -1) {
                            src = src.replace(links[n], links[n].concat('&', utm.tag()));
                        } else {
                            src = src.replace(links[n], links[n].concat('?', utm.tag()));
                        }
                    }
                }
                cb(null, src);
            })))
            .pipe(gulp.dest( dev ? basePaths.src : basePaths.dist ));
    });

    /**
     * Watch files for changes
     * ========================================
     */
    gulp.task('watch', function() {
        gulp.watch( paths.scss.src , ['sass']);
        gulp.watch( [ paths.email.src, paths.html ] , ['watch-dev']);
    });

    gulp.task('watch-dev', function() {
        runSequence('fileinclude', 'utm')
    });

    gulp.task('default', ['dev', 'watch']);
    gulp.task('dev', function(cb) {
        runSequence('sass',
                    'fileinclude',
                    'utm',
                    'prettify',
                    'webserver')
    });

    gulp.task('dist', function(cb) {
    	dev = false;
        runSequence('clean',
                    'sass',
                    'fileinclude',
                    'utm',
                    'prettify',
                    'premailer')
    });

    gulp.task('web', function(cb) {
        dev = false;
        web = true;
        runSequence('clean',
                    ['sass', 'replace'],
                    'fileinclude',
                    'target-html',
                    'utm',
                    'premailer',
                    'prettify')
    });