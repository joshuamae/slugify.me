"""Install checksum-verified official Guard 3.2.1 Linux binaries in the image."""

import hashlib
import io
from pathlib import Path
import sys
import tarfile
import urllib.request

ASSETS = {
    "arm64": ("aarch64", "cd378026dad0f865926ab1d1c082e2faf825f7fd888a9fe6b5c142cdf175c129"),
    "amd64": ("x86_64", "8c66efb19c63e6c2bf26b9a41bbcf2f85baa8a937b01d350940194faaf64cf1d"),
}
architecture, expected = ASSETS[sys.argv[1]]
url = ("https://github.com/aws-cloudformation/cloudformation-guard/releases/download/3.2.1/"
       f"cfn-guard-v3-{architecture}-linux-latest.tar.gz")
with urllib.request.urlopen(url, timeout=120) as response:
    archive = response.read()
if hashlib.sha256(archive).hexdigest() != expected:
    raise ValueError("Guard release checksum mismatch")
with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as bundle:
    binaries = [entry for entry in bundle.getmembers()
                if entry.isfile() and Path(entry.name).name == "cfn-guard"]
    if len(binaries) != 1:
        raise ValueError("Expected one Guard executable")
    destination = Path("/usr/local/bin/cfn-guard")
    destination.write_bytes(bundle.extractfile(binaries[0]).read())
    destination.chmod(0o755)
