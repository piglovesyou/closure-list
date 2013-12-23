#######################################################################
#
#
#
#######################################################################

USAGE_TEXT="\n
    ---- Usage ---- \n\n\
    $ ./run.sh setup\t# Fetch Closure Library and Closure Compiler.\n
    $ ./run.sh build\t# .\n
        \n"


LIBS_DIR=libs/

CLOSURELIBRARY_DIR=${LIBS_DIR}closure-library/
CLOSURELIBRARY_REMOTE_DIR=http://closure-library.googlecode.com/svn/trunk/

CLOSURECOMPILER_DIR=${LIBS_DIR}closure-compiler/
CLOSURECOMPILER_REMOTE_TAR=http://dl.google.com/closure-compiler/compiler-latest.tar.gz


case $1 in
    setup)
        mkdir $LIBS_DIR > /dev/null 2>&1
        PWD=`pwd`

        # Download Closure Library
        rm -rf $CLOSURELIBRARY_DIR
        svn co -r 2519 $CLOSURELIBRARY_REMOTE_DIR ${LIBS_DIR}closure-library

        # Download Closure Compiler
        rm -rf $CLOSURECOMPILER_DIR
        mkdir -p $CLOSURECOMPILER_DIR
        wget $CLOSURECOMPILER_REMOTE_TAR -O - | tar -xf - -C $CLOSURECOMPILER_DIR

        ;;

    build)
        $CLOSURELIBRARY_DIR/closure/bin/build/closurebuilder.py \
        --root=$CLOSURELIBRARY_DIR \
        --root=piglovesyou \
        --namespace="example" \
        --compiler_jar=${CLOSURECOMPILER_DIR}compiler.jar \
        --compiler_flags="--compilation_level=ADVANCED_OPTIMIZATIONS" \
        --compiler_flags="--warning_level=VERBOSE" \
        --compiler_flags="--js=${CLOSURELIBRARY_DIR}/closure/goog/deps.js" \
        --output_mode=compiled \
        ./export.js \
        > min.js
#         --compiler_flags="--debug=true" \
        ;;

    *)
        echo -e $USAGE_TEXT
        ;;
esac
