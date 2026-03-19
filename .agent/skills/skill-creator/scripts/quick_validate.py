#!/usr/bin/env python3
"""
Quick validation of a skill structure.

Usage:
    python quick_validate.py ./my-skill
"""

import argparse
import re
import sys
from pathlib import Path

try:
    import yaml
except ModuleNotFoundError:
    print("[ERROR] Missing dependency: pyyaml")
    print("Install with: pip install pyyaml")
    sys.exit(1)


def validate_skill(skill_path: Path) -> bool:
    """Validate skill structure and SKILL.md."""

    skill_path = skill_path.resolve()

    errors = []
    warnings = []

    # Check if path exists
    if not skill_path.exists():
        print(f"[ERROR] Path does not exist: {skill_path}")
        return False

    # Check if SKILL.md exists
    skill_md = skill_path / "SKILL.md"
    if not skill_md.exists():
        errors.append("SKILL.md not found (required)")
        print(f"[ERROR] {errors[-1]}")
        return False

    # Parse and validate SKILL.md
    try:
        with open(skill_md, "r", encoding="utf-8") as f:
            content = f.read()

        # Extract frontmatter
        if not content.startswith("---"):
            errors.append("SKILL.md must start with YAML frontmatter (---)")
        else:
            # Find end of frontmatter
            lines = content.split("\n")
            end_idx = None
            for i in range(1, len(lines)):
                if lines[i] == "---":
                    end_idx = i
                    break

            if end_idx is None:
                errors.append("Invalid YAML frontmatter (missing closing ---)")
            else:
                frontmatter_str = "\n".join(lines[1:end_idx])
                try:
                    frontmatter = yaml.safe_load(frontmatter_str)

                    # Check required fields
                    if not frontmatter.get("name"):
                        errors.append("Missing required field: name")
                    else:
                        name = frontmatter["name"]
                        if len(name) < 1 or len(name) > 64:
                            errors.append("Field 'name' must be 1-64 chars")
                        if not re.match(r"^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$", name):
                            errors.append(
                                f"Invalid skill name '{name}' - must be kebab-case lowercase (a-z0-9-)"
                            )
                        if name != skill_path.name:
                            errors.append(
                                f"Skill name '{name}' must match directory name '{skill_path.name}'"
                            )

                    if not frontmatter.get("description"):
                        errors.append("Missing required field: description")
                    else:
                        description = str(frontmatter["description"]).strip()
                        if len(description) > 1024:
                            errors.append("Field 'description' must be <= 1024 chars")

                    if frontmatter.get("allowed-tools") is not None and not isinstance(
                        frontmatter.get("allowed-tools"), list
                    ):
                        warnings.append("Field 'allowed-tools' should be a YAML list when present")

                except yaml.YAMLError as e:
                    errors.append(f"Invalid YAML: {e}")

    except Exception as e:
        errors.append(f"Error reading SKILL.md: {e}")

    # Check directory structure
    if (skill_path / "scripts").exists() and not list((skill_path / "scripts").glob("*")):
        warnings.append("scripts/ directory is empty")

    if (skill_path / "references").exists() and not list((skill_path / "references").glob("*")):
        warnings.append("references/ directory is empty")

    if not (skill_path / "scripts").exists():
        warnings.append("scripts/ directory missing (recommended)")

    if not (skill_path / "references").exists():
        warnings.append("references/ directory missing (recommended)")

    line_count = len(skill_md.read_text(encoding="utf-8", errors="ignore").splitlines())
    if line_count > 500:
        warnings.append(f"SKILL.md has {line_count} lines; consider moving long docs to references/")

    body = skill_md.read_text(encoding="utf-8", errors="ignore")
    for section in ["## Purpose", "## When to Use", "## How to Use"]:
        if section not in body:
            warnings.append(f"Missing recommended section: {section}")

    # Print results
    if errors:
        print("[ERROR] Validation failed:\n")
        for err in errors:
            print(f"  - {err}")
        return False

    if warnings:
        print("[WARN] Warnings:\n")
        for warn in warnings:
            print(f"  - {warn}")

    print("[OK] Skill validation passed!")
    print(f"\nSkill structure is valid and ready for packaging.")
    return True


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Validate a skill structure"
    )

    parser.add_argument(
        "path",
        help="Path to skill directory"
    )

    args = parser.parse_args()
    skill_path = Path(args.path)

    if validate_skill(skill_path):
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
