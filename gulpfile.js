
const gulp = require('gulp'),
      autoprefixer = require('gulp-autoprefixer'),
      plumber = require('gulp-plumber'),
      notify = require('gulp-notify'),
      cleanCSS = require('gulp-clean-css'),
      sourcemaps = require('gulp-sourcemaps'),
      del = require('del'),
      browserSync = require('browser-sync').create(),
      sass = require('gulp-sass')(require('sass')),
      fileInclude = require('gulp-file-include'),
      htmlmin = require('gulp-htmlmin'),
      typograf = require('gulp-typograf'),
      imagemin = require('gulp-imagemin'),
      webp = require('gulp-webp'),
      avif = require('gulp-avif'),
      svgSprite = require('gulp-svg-sprite'),
      svgmin = require('gulp-svgmin'),
      cheerio = require('gulp-cheerio'),
      replace = require('gulp-replace'),
      gulpif = require('gulp-if'),
      babel = require('gulp-babel'),
      uglify = require('gulp-uglify'),
      webpack = require('webpack-stream');


const src = 'src/',
      app = 'app/';

const config = {
  src: {
    html: src + '/*.html',
    style: src + 'scss/**/*.scss',
    js: src + 'js/main.js',
    img: src + 'img/**/*.*',
    fonts: src + 'fonts/*.*',
    resources: src +'resources/**/*.*',
    svg: src + '/img/svg/*.svg'
  },
  app: {
    html: app,
    style: app + 'css/',
    js: app + 'js/',
    img: app + 'img/',
    fonts: app + 'fonts/',
    resources: app
  },
  watch: {
    html: src + '**/**/*.html',
    style: src + 'scss/**/*.scss',
    js: src + 'js/**/*.js',
    img: src + 'img/**/*.*',
    fonts: src + 'fonts/*.*',
    resources: src +'resources/**/*.*',
    svg: src + '/img/svg/*.svg'
  }
}

let isProd = false;

const clean = () => {
  return del([app])
}

const svgSpriteTask = () => {
  return gulp.src(config.src.svg)
    .pipe(
      svgmin({
        js2svg: {
          pretty: true,
        },
      })
    )
    .pipe(
      cheerio({
        run: function ($) {
          $('[fill]').removeAttr('fill');
          $('[stroke]').removeAttr('stroke');
          $('[style]').removeAttr('style');
        },
        parserOptions: {
          xmlMode: true
        },
      })
    )
    .pipe(replace('&gt;', '>'))
    .pipe(svgSprite({
      mode: {
        stack: {
          sprite: "../sprite.svg"
        }
      },
    }))
    .pipe(gulp.dest(config.app.img))
}

const htmlIncludeTask = () => {
  return gulp.src(config.src.html)
  .pipe(plumber({
    errorHandler: notify.onError(error => ({
      title: 'html',
      message: error.message
    }))
  }))
    .pipe(fileInclude({
      prefix: '@',
      basepath: '@file'
    }))
    .pipe(typograf({ locale: ['ru', 'en-US'] }))
    .pipe(gulpif(isProd,htmlmin({ collapseWhitespace: true })))
    .pipe(gulp.dest(config.app.html))
    .pipe(browserSync.stream());
}

const scssTask = () => {
  return gulp.src(config.src.style)
    .pipe(gulpif(!isProd, sourcemaps.init()))
    .pipe(plumber({
      errorHandler: notify.onError(error => ({
        title: 'scss',
        message: error.message
      }))
    }))
    .pipe(sass())
    .pipe(autoprefixer({
      cascade: false,
      grid: true,
      overrideBrowserslist: ["last 5 versions"]
    }))
    .pipe(gulpif(isProd, cleanCSS({
      level: 2
    })))
    .pipe(gulpif(!isProd,sourcemaps.write()))
    .pipe(gulp.dest(config.app.style))
    .pipe(browserSync.stream());
}


const jsTask = () => {
  return gulp.src(config.src.js)
  .pipe(gulpif(!isProd, sourcemaps.init()))
    .pipe(plumber({
      errorHandler: notify.onError(error => ({
        title: 'JavaScript',
        message: error.message
      }))
    }))
    .pipe(babel())
    .pipe(webpack({
      mode: isProd ? 'production' : 'development',
      output: {
        filename: 'main.js',
      },
      module: {
        rules: [{
          test: /\.m?js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  targets: "defaults"
                }]
              ]
            }
          }
        }]
      },
      devtool: !isProd ? 'source-map' : false
    }))
    .on('error', function (err) {
      console.error('WEBPACK ERROR', err);
      this.emit('end');
    })
    .pipe(gulpif(isProd,uglify()))
    .pipe(gulpif(!isProd,sourcemaps.write()))
    .pipe(gulp.dest(config.app.js))
    .pipe(browserSync.stream());
}

const resourcesTask = () => {
  return gulp.src(config.src.resources)
    .pipe(gulp.dest(config.app.resources))
}

const imgTask = () => {
  return gulp.src(config.src.img)
    .pipe(gulpif(isProd,imagemin([
      imagemin.mozjpeg({
        quality: 80,
        progressive: true
      }),
      imagemin.optipng({
        optimizationLevel: 2
      }),
    ])))
    .pipe(gulp.dest(config.app.img))
}

const webpTask = () => {
  return gulp.src(config.src.img)
  .pipe(webp())
    .pipe(gulp.dest(config.app.img))
}

const avifTask = () => {
  return gulp.src(config.src.img)
  .pipe(avif())
    .pipe(gulp.dest(config.app.img))
}



const watchFiles = () => {
    browserSync.init({
      server: {
        baseDir: app
      },
    });
  gulp.watch([config.watch.html], gulp.series(htmlIncludeTask));
  gulp.watch([config.watch.style], gulp.series(scssTask));
  gulp.watch([config.watch.js], gulp.series(jsTask));
  gulp.watch([config.watch.img], gulp.series(imgTask));
  gulp.watch([config.watch.img], gulp.series(webpTask));
  gulp.watch([config.watch.img], gulp.series(avifTask));
  gulp.watch([config.watch.resources], gulp.series(resourcesTask));
  gulp.watch([config.watch.svg], gulp.series(svgSpriteTask));
}

const toProd = (done) => {
  isProd = true;
  done();
};

exports.default = gulp.series(clean, htmlIncludeTask, scssTask, jsTask, resourcesTask, imgTask, webpTask, avifTask, svgSpriteTask, watchFiles);

exports.build = gulp.series(toProd, clean, htmlIncludeTask, scssTask, jsTask, resourcesTask, imgTask, webpTask, avifTask, svgSpriteTask);

exports.clean = clean;

