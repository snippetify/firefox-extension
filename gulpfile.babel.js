/**
 * Gulp default configuration for chrome extension.
 * @license MIT
 * @author Evens Pierre <pierre.evens16@gmail.com>
 */
const zip = require('gulp-zip')
const sass = require('gulp-sass')
const cache = require('gulp-cache')
const babel = require('gulp-babel')
const clean = require('gulp-clean')
const eslint = require('gulp-eslint')
const rename = require('gulp-rename')
const uglify = require('gulp-uglify')
const minify = require('gulp-minifier')
const imagemin = require('gulp-imagemin')
const cleanCSS = require('gulp-clean-css')
const jsonmin = require('gulp-json-minify')
const rollup = require('gulp-better-rollup')
const sourcemaps = require('gulp-sourcemaps')
const commonjs = require('@rollup/plugin-commonjs')
const resolve = require('@rollup/plugin-node-resolve')
const { src, dest, watch, series, parallel } = require('gulp')

function cssTranspile () {
    return src('src/scss/**/*.scss')
        .pipe(sass())
        .pipe(dest('tmp/styles'))
}

function cssMinify () {
    return src('tmp/styles/**/*.css')
        .pipe(sourcemaps.init())
        .pipe(cleanCSS({ compatibility: '*' }))
        .pipe(rename({ suffix: '.min' }))
        .pipe(sourcemaps.write())
        .pipe(dest('dist/css'))
}

function cssVendor () {
    return src([
        'node_modules/simplebar/dist/simplebar.min.css',
        'node_modules/bootstrap/dist/css/bootstrap.min.css',
        'node_modules/@fortawesome/fontawesome-free/css/all.min.css'
    ])
        .pipe(dest('dist/vendor/css'))
}

function fontVendor () {
    return src([
        'node_modules/@fortawesome/fontawesome-free/webfonts/*'
    ])
        .pipe(dest('dist/vendor/webfonts'))
}

function jsTranspile () {
    return src('src/js/**/*.js')
        .pipe(sourcemaps.init())
        .pipe(babel({ presets: ['@babel/env'] }))
        .pipe(sourcemaps.write())
        .pipe(dest('tmp/js'))
}

function jsRollup () {
    return src('tmp/js/**/*.js')
        .pipe(rollup({ plugins: [resolve(), commonjs()] }, 'umd'))
        .pipe(dest('tmp/js'))
}

function jsMinify () {
    return src('tmp/js/*.js')
        .pipe(rename({ suffix: '.min' }))
        .pipe(uglify())
        .pipe(dest('dist/js'))
}

function jsVendor () {
    return src([
        'node_modules/jquery/dist/jquery.min.js',
        'node_modules/simplebar/dist/simplebar.min.js',
        'node_modules/bootstrap/dist/js/bootstrap.min.js'
    ])
        .pipe(dest('dist/vendor/js'))
}

function htmlMinify () {
    return src('src/**/*.html')
        .pipe(minify({
            minify: true,
            minifyHTML: {
                minifyJS: true,
                minifyCSS: true,
                removeComments: true,
                collapseWhitespace: true,
                conservativeCollapse: true
            }
        }))
        .pipe(dest('dist'))
}

function imageMinify () {
    return src('src/img/**/*.+(png|jpg|gif|svg)')
        .pipe(cache(imagemin({
            interlaced: true,
            progressive: true,
            svgoPlugins: [{ cleanupIDs: false }]
        })))
        .pipe(dest('dist/img'))
}

function jsonMinify () {
    return src('src/**/*.json')
        .pipe(jsonmin())
        .pipe(dest('dist'))
}

function jsLint () {
    return src('src/js/**/*.js')
        .pipe(eslint({
            env: {
                es6: true
            }
        }))
        .pipe(eslint.format())
        .pipe(eslint.failAfterError())
}

function zipFiles () {
    return src('dist/*')
        .pipe(zip('snippetify.zip'))
        .pipe(dest('./'))
}

function removeZip () {
    return src('snippetify.zip', { read: false, allowEmpty: true }).pipe(clean())
}

function cleanTmp () {
    return src('tmp', { read: false, allowEmpty: true }).pipe(clean())
}

function cleanDist () {
    return src('dist', { read: false, allowEmpty: true }).pipe(clean())
}

function watchFiles (cb) {
    watch('src/**/*.json', series(jsonMinify))
    watch('src/**/*.html', series(htmlMinify))
    watch('src/js/**/*.js', series(jsLint, jsTranspile, jsRollup, jsMinify))
    watch('src/scss/**/*.scss', series(cssTranspile, cssMinify))
    watch('src/img/**/*.+(png|jpg|gif|svg)', series(imageMinify))
    cb() // Async completion
}

exports.clean = parallel(cleanDist, cleanTmp, removeZip)
exports.watch = watchFiles
exports.default = series(
    cleanDist,
    parallel(jsLint, jsVendor, cssVendor, fontVendor),
    parallel(jsTranspile, cssTranspile),
    jsRollup,
    parallel(cssMinify, jsMinify, htmlMinify, imageMinify, jsonMinify),
    zipFiles,
    cleanTmp
)
