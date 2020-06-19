const gulp = require('gulp');
const browserify = require('browserify')
const fs = require('fs');
const csso = require('gulp-csso');
const htmlminify = require('gulp-html-minify');
const htmlreplace = require('gulp-html-replace');
const source = require('vinyl-source-stream');
const uglify = require('gulp-uglify-es').default;
const minifyHTML = require('gulp-minify-html');


function processTask(cb) {

    ['./manifest.json', './WebEnclave-png.png', './warn.png'].forEach(f => {
        fs.createReadStream(f).pipe(fs.createWriteStream(f.replace('./', `./dist/`)));
    });

    ['./block.html'].forEach(f => {
        gulp.src(f).pipe(minifyHTML()).pipe(gulp.dest('./dist/'));
    });



    ['./content.js', './background.js', './block.js', './flag.js'].forEach(f => {
        gulp.src(f).pipe(uglify({
            compress: {
                warnings: false,
                drop_console: true,
                drop_debugger: true
            }
        })).on('error', function (err) { console.log(err) }).pipe(gulp.dest('./dist/'));
    });

    ['./block.css'].forEach(f => {
        gulp.src(f).pipe(csso()).pipe(gulp.dest('./dist/'));
    });



    //sandbox.html
    gulp.src('./sandbox.html').pipe(htmlreplace({
        cssInline: {
            src: gulp.src('./sandbox.css').pipe(csso()),
            tpl: `<style>%s</style>`
        },
        jsInline: {
            src: gulp.src('./sandbox.js').pipe(uglify({
                compress: {
                    warnings: false,
                    drop_console: true,
                    drop_debugger: true
                }
            })),
            tpl: `<script>%s</script>`
        }
    })).pipe(htmlminify()).pipe(gulp.dest('./dist/'));


    //proxy.html
    gulp.src('./proxy.html').pipe(htmlreplace({
        cssInline: {
            src: gulp.src('./proxy.css').pipe(csso()),
            tpl: `<style>%s</style>`
        },
        jsInline: {
            src: gulp.src('./proxy.js').pipe(uglify({
                compress: {
                    warnings: false,
                    drop_console: true,
                    drop_debugger: true
                }
            })),
            tpl: `<script>%s</script>`
        }
    })).pipe(htmlminify()).pipe(gulp.dest('./dist/'));


    //block.html have to add CSP.... so, won't make it ..
    /*
    gulp.src('./block.html').pipe(htmlreplace({
        cssInline: {
            src: gulp.src('./block.css').pipe(csso()),
            tpl: `<style>%s</style>`
        },
        jsInline: {
            src: gulp.src('./block.js').pipe(uglify()),
            tpl: `<script>%s</script>`
        }
    })).pipe(htmlminify()).pipe(gulp.dest('./dist/'));
    */

    cb();

}

exports.default = gulp.series(processTask);