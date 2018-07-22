OUTDIR="CTV"
NAME="$OUTDIR.tar.gz"
rm -rf $OUTDIR
rm $NAME || true
wget -L --header "PRIVATE-TOKEN: <GITLAB-TOKEN>" "https://gitlab.com/ctvisualizer/front-end/-/jobs/artifacts/<branch>/raw/CTVisualizer-darwin-x64.tar.gz?job=buildTar" -O "./$NAME"
mkdir $OUTDIR
tar -xzf $NAME -C $OUTDIR
lldb "$OUTDIR/CTVisualizer.app"