{ pkgs }: {
  deps = [
    pkgs.nodejs-18_x
    pkgs.cairo
    pkgs.pango
    pkgs.libjpeg
    pkgs.giflib
    pkgs.pkg-config
  ];
}
