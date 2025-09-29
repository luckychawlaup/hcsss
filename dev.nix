{ pkgs ? import <nixpkgs> {} }:
{
  packages = with pkgs; [
    supabase-cli
  ];
}