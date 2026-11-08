using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Windows.Forms;
using Microsoft.Win32;

[assembly: AssemblyTitle("Uninstall XL Creator Studio")]
[assembly: AssemblyProduct("XL Creator Studio")]
[assembly: AssemblyCompany("XL Exhibit Production LLC")]
[assembly: AssemblyVersion("1.0.0.0")]

namespace XLCreatorStudioUninstaller
{
    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            bool silent = false;
            foreach (string a in args)
            {
                if (string.Equals(a, "/S", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(a, "--silent", StringComparison.OrdinalIgnoreCase))
                {
                    silent = true;
                }
            }

            if (!silent)
            {
                DialogResult res = MessageBox.Show(
                    "Are you sure you want to uninstall XL Creator Studio from this computer?\n\nClick Yes to remove the application, shortcuts, and local studio cache.",
                    "Uninstall XL Creator Studio",
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Question
                );
                if (res != DialogResult.Yes) return;
            }

            try
            {
                foreach (Process p in Process.GetProcessesByName("XL Creator Studio"))
                {
                    try { p.Kill(); p.WaitForExit(3000); } catch { }
                }
            }
            catch { }

            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
            string startMenu = Environment.GetFolderPath(Environment.SpecialFolder.Programs);

            // 1. Run NSIS uninstaller if installed in LocalAppData\Programs\xl-creator-studio
            string nsisUninst = Path.Combine(localAppData, "Programs", "xl-creator-studio", "Uninstall XL Creator Studio.exe");
            string currentExe = Assembly.GetExecutingAssembly().Location;
            if (File.Exists(nsisUninst) && !string.Equals(Path.GetFullPath(nsisUninst), Path.GetFullPath(currentExe), StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    ProcessStartInfo psi = new ProcessStartInfo(nsisUninst, "/S")
                    {
                        UseShellExecute = false,
                        CreateNoWindow = true
                    };
                    Process proc = Process.Start(psi);
                    if (proc != null) proc.WaitForExit(15000);
                }
                catch { }
            }

            // 2. Remove shortcuts
            string[] shortcuts = new string[]
            {
                Path.Combine(desktop, "XL Creator Studio.lnk"),
                Path.Combine(startMenu, "XL Creator Studio.lnk"),
                Path.Combine(startMenu, "XL Creator Studio", "XL Creator Studio.lnk"),
                Path.Combine(startMenu, "XL Creator Studio", "Uninstall XL Creator Studio.lnk")
            };
            foreach (string lnk in shortcuts)
            {
                try { if (File.Exists(lnk)) File.Delete(lnk); } catch { }
            }
            try
            {
                string smFolder = Path.Combine(startMenu, "XL Creator Studio");
                if (Directory.Exists(smFolder)) Directory.Delete(smFolder, true);
            }
            catch { }

            // 3. Remove AppData workspace & updater cache
            string[] dataDirs = new string[]
            {
                Path.Combine(appData, "XL Creator Studio"),
                Path.Combine(appData, "xl-creator-studio"),
                Path.Combine(localAppData, "xl-creator-studio-updater"),
                Path.Combine(localAppData, "Programs", "xl-creator-studio")
            };
            foreach (string dir in dataDirs)
            {
                try { if (Directory.Exists(dir)) Directory.Delete(dir, true); } catch { }
            }

            // 4. Clean registry entry if present
            try
            {
                using (RegistryKey key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall", true))
                {
                    if (key != null)
                    {
                        foreach (string sub in key.GetSubKeyNames())
                        {
                            try
                            {
                                using (RegistryKey sk = key.OpenSubKey(sub))
                                {
                                    string disp = sk != null ? Convert.ToString(sk.GetValue("DisplayName")) : "";
                                    if (disp.IndexOf("XL Creator Studio", StringComparison.OrdinalIgnoreCase) >= 0)
                                    {
                                        key.DeleteSubKeyTree(sub, false);
                                    }
                                }
                            }
                            catch { }
                        }
                    }
                }
            }
            catch { }

            if (!silent)
            {
                MessageBox.Show(
                    "XL Creator Studio has been completely uninstalled.",
                    "Uninstall Complete",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
            }
        }
    }
}
