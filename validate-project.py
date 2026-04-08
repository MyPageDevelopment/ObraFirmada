#!/usr/bin/env python3
"""
Script para verificar integridad del proyecto ObraFirmada
Válida estructura, archivos y configuración
"""

import os
import sys
from pathlib import Path

class ProjectValidator:
    def __init__(self, root_path):
        self.root = Path(root_path)
        self.errors = []
        self.warnings = []
        self.success = []
    
    def check_file(self, path, description):
        """Verificar que un archivo existe"""
        full_path = self.root / path
        if full_path.exists():
            self.success.append(f"✅ {description}: {path}")
            return True
        else:
            self.errors.append(f"❌ FALTA: {description}: {path}")
            return False
    
    def check_directory(self, path, description):
        """Verificar que un directorio existe"""
        full_path = self.root / path
        if full_path.is_dir():
            self.success.append(f"✅ {description}: {path}")
            return True
        else:
            self.errors.append(f"❌ FALTA: {description}: {path}")
            return False
    
    def validate(self):
        """Ejecutar todas las validaciones"""
        print("🔍 Validando estructura del proyecto ObraFirmada...\n")
        
        # Archivos raíz
        self.check_file("docker-compose.yml", "Docker Compose")
        self.check_file("README.md", "README Principal")
        self.check_file("ARCHITECTURE.md", "Documentación Arquitectura")
        self.check_file(".env.example", "Archivo env ejemplo")
        self.check_file(".gitignore", "Git ignore")
        
        # Backend
        self.check_directory("backend", "Directorio Backend")
        self.check_file("backend/package.json", "Backend package.json")
        self.check_file("backend/tsconfig.json", "Backend TypeScript config")
        self.check_file("backend/Dockerfile", "Backend Dockerfile")
        self.check_file("backend/prisma/schema.prisma", "Prisma Schema")
        self.check_file("backend/src/main.ts", "Main backend")
        self.check_file("backend/src/app.module.ts", "App Module")
        self.check_file("backend/src/modules/enrollment/enrollment.module.ts", "Enrollment Module")
        
        # Frontend
        self.check_directory("frontend", "Directorio Frontend")
        self.check_file("frontend/package.json", "Frontend package.json")
        self.check_file("frontend/tsconfig.json", "Frontend TypeScript config")
        self.check_file("frontend/next.config.js", "Next config")
        self.check_file("frontend/tailwind.config.js", "Tailwind config")
        self.check_file("frontend/postcss.config.js", "PostCSS config")
        self.check_file("frontend/src/app/page.tsx", "Frontend homepage")
        self.check_file("frontend/src/app/enrollment/page.tsx", "Enrollment page")
        
        # Mostrar resultados
        print("\n" + "="*50)
        print("RESULTADOS DE VALIDACIÓN")
        print("="*50 + "\n")
        
        if self.success:
            for msg in self.success[:5]:  # Mostrar primeros 5
                print(msg)
            if len(self.success) > 5:
                print(f"... y {len(self.success)-5} archivos más ✅")
        
        if self.warnings:
            print()
            for msg in self.warnings:
                print(msg)
        
        if self.errors:
            print("\n⚠️ ERRORES ENCONTRADOS:")
            for msg in self.errors:
                print(msg)
        
        print("\n" + "="*50)
        print(f"✅ Exitosos: {len(self.success)}")
        print(f"⚠️  Warnings: {len(self.warnings)}")
        print(f"❌ Errores: {len(self.errors)}")
        print("="*50 + "\n")
        
        return len(self.errors) == 0

if __name__ == "__main__":
    validator = ProjectValidator(".")
    success = validator.validate()
    sys.exit(0 if success else 1)
