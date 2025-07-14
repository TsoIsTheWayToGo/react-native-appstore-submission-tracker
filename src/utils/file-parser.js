/**
 * File parsing utilities for app bundles and IPA files
 */

const fs = require('fs');
const path = require('path');
const plist = require('plist');
const yauzl = require('yauzl');
const { promisify } = require('util');

class FileParser {
  constructor() {
    this.tempFiles = [];
  }

  async parseIPA(ipaPath) {
    return new Promise((resolve, reject) => {
      yauzl.open(ipaPath, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          return reject(new Error(`Could not open IPA file: ${err.message}`));
        }

        const artifacts = {
          infoPlist: null,
          appBundle: null,
          entitlements: null,
          privacyManifest: null
        };

        zipfile.readEntry();

        zipfile.on('entry', (entry) => {
          const fileName = entry.fileName;

          // Look for main app Info.plist (should be in Payload/AppName.app/Info.plist)
          // Exclude all .bundle and .framework files
          if (
            fileName.match(/^Payload\/[^\/]+\.app\/Info\.plist$/) &&
            !fileName.includes('.bundle/') &&
            !fileName.includes('.framework/') &&
            !fileName.includes('PlugIns/') &&
            !fileName.includes('Watch/')
          ) {
            console.log(`DEBUG: Found main app Info.plist at: ${fileName}`); // Temporary debug
            this.extractFileFromZip(zipfile, entry, (content) => {
              try {
                artifacts.infoPlist = plist.parse(content.toString());
                console.log(`DEBUG: Bundle ID: ${artifacts.infoPlist.CFBundleIdentifier}`); // Temporary debug
                artifacts.appBundle = path.dirname(fileName);
              } catch (error) {
                reject(new Error(`Could not parse Info.plist: ${error.message}`));
                return;
              }
              zipfile.readEntry();
            });
            return;
          }

          // Look for Privacy Manifest in main app bundle
          if (
            fileName.match(/^Payload\/[^\/]+\.app\/PrivacyInfo\.xcprivacy$/) &&
            !fileName.includes('.bundle/') &&
            !fileName.includes('.framework/') &&
            !fileName.includes('PlugIns/')
          ) {
            this.extractFileFromZip(zipfile, entry, (content) => {
              try {
                artifacts.privacyManifest = plist.parse(content.toString());
              } catch (error) {
                // Privacy manifest parsing is optional
                console.warn(`Warning: Could not parse privacy manifest: ${error.message}`);
              }
              zipfile.readEntry();
            });
            return;
          }

          // Look for entitlements in main app bundle
          if (
            (fileName.includes('.app.dSYM') ||
              fileName.includes('archived-expanded-entitlements.xcent')) &&
            fileName.match(/^Payload\/[^\/]+\.app\//) &&
            !fileName.includes('.bundle/') &&
            !fileName.includes('.framework/')
          ) {
            this.extractFileFromZip(zipfile, entry, (content) => {
              try {
                artifacts.entitlements = plist.parse(content.toString());
              } catch (error) {
                // Entitlements parsing is optional
                console.warn(`Warning: Could not parse entitlements: ${error.message}`);
              }
              zipfile.readEntry();
            });
            return;
          }

          zipfile.readEntry();
        });

        zipfile.on('end', () => {
          if (!artifacts.infoPlist) {
            reject(new Error('Main app Info.plist not found in IPA file'));
            return;
          }
          resolve(artifacts);
        });

        zipfile.on('error', (err) => {
          reject(new Error(`Error reading IPA file: ${err.message}`));
        });
      });
    });
  }

  async parseAppBundle(appPath) {
    const artifacts = {
      infoPlist: null,
      appBundle: appPath,
      entitlements: null,
      privacyManifest: null
    };

    // Parse Info.plist
    const infoPlistPath = path.join(appPath, 'Info.plist');
    if (!fs.existsSync(infoPlistPath)) {
      throw new Error('Info.plist not found in app bundle');
    }

    try {
      const plistData = fs.readFileSync(infoPlistPath, 'utf8');
      artifacts.infoPlist = plist.parse(plistData);
    } catch (error) {
      throw new Error(`Could not parse Info.plist: ${error.message}`);
    }

    // Look for Privacy Manifest
    const privacyManifestPath = path.join(appPath, 'PrivacyInfo.xcprivacy');
    if (fs.existsSync(privacyManifestPath)) {
      try {
        const privacyData = fs.readFileSync(privacyManifestPath, 'utf8');
        artifacts.privacyManifest = plist.parse(privacyData);
      } catch (error) {
        console.warn(`Warning: Could not parse privacy manifest: ${error.message}`);
      }
    }

    // Look for entitlements file
    const entitlementsPath = path.join(appPath, 'archived-expanded-entitlements.xcent');
    if (fs.existsSync(entitlementsPath)) {
      try {
        const entitlementsData = fs.readFileSync(entitlementsPath, 'utf8');
        artifacts.entitlements = plist.parse(entitlementsData);
      } catch (error) {
        console.warn(`Warning: Could not parse entitlements: ${error.message}`);
      }
    }

    return artifacts;
  }

  extractFileFromZip(zipfile, entry, callback) {
    zipfile.openReadStream(entry, (err, readStream) => {
      if (err) {
        console.warn(`Warning: Could not read ${entry.fileName}: ${err.message}`);
        zipfile.readEntry();
        return;
      }

      const chunks = [];
      readStream.on('data', (chunk) => chunks.push(chunk));
      readStream.on('end', () => {
        const content = Buffer.concat(chunks);
        callback(content);
      });
      readStream.on('error', (err) => {
        console.warn(`Warning: Error reading ${entry.fileName}: ${err.message}`);
        zipfile.readEntry();
      });
    });
  }

  async findFiles(directory, pattern) {
    const glob = require('glob');
    const globAsync = promisify(glob);

    try {
      return await globAsync(pattern, { cwd: directory });
    } catch (error) {
      throw new Error(`Could not search for files: ${error.message}`);
    }
  }

  async getFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (error) {
      throw new Error(`Could not get file size: ${error.message}`);
    }
  }

  async checkFileExists(filePath) {
    return fs.existsSync(filePath);
  }

  async readTextFile(filePath) {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      throw new Error(`Could not read file ${filePath}: ${error.message}`);
    }
  }

  async parsePlist(filePath) {
    try {
      const content = await this.readTextFile(filePath);
      return plist.parse(content);
    } catch (error) {
      throw new Error(`Could not parse plist file ${filePath}: ${error.message}`);
    }
  }

  cleanup() {
    // Clean up any temporary files
    for (const tempFile of this.tempFiles) {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch (error) {
        console.warn(`Warning: Could not clean up temp file ${tempFile}: ${error.message}`);
      }
    }
    this.tempFiles = [];
  }
}

module.exports = { FileParser };
