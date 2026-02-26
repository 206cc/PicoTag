(function()
{
    function wire()
    {
        const btn = document.getElementById("btnLogout");
        if (!btn) return false;

        btn.style.display = "inline-flex";

        btn.addEventListener("click", async () =>
        {
            try
            {
                await fetch("/api/admin/logout",
                {
                    method: "POST",
                    credentials: "include"
                });
            }
            catch (e)
            {}

            location.replace("../index.html");
        });
        return true;
    }

    if (!wire())
    {
        document.addEventListener("DOMContentLoaded", wire,
        {
            once: true
        });
    }
})();
