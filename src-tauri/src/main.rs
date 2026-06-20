// Evita abrir una consola en Windows en release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    vowen_clone_lib::run()
}
