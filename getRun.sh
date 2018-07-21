OUTDIR="CTV"
NAME="$OUTDIR.tar.gz"
rm -rf $OUTDIR
rm $NAME || true
wget -L --header "PRIVATE-TOKEN: TOKEN" "https://gitlab.com/ctvisualizer/front-end/-/jobs/artifacts/build-pipeline/raw/CTVisualizer-darwin-x64.tar.gz?job=buildTar" -O "./$NAME"
mkdir $OUTDIR
tar -xzf $NAME -C $OUTDIR
open "$OUTDIR/CTVisualizer.app"