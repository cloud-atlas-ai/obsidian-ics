#!/usr/bin/env node

/**
 * Script to update Windows to IANA timezone mappings from Unicode CLDR data
 *
 * Usage: node scripts/update-timezones.js
 *
 * This script fetches the latest windowsZones.xml from Unicode CLDR project
 * and updates the timezone mapping in src/icalUtils.ts
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const CLDR_URL = 'https://raw.githubusercontent.com/unicode-org/cldr/main/common/supplemental/windowsZones.xml';
const OUTPUT_TS_FILE = path.join(__dirname, '..', 'src', 'generated', 'windowsTimezones.ts');
const OUTPUT_JSON_FILE = path.join(__dirname, '..', 'src', 'generated', 'windows-to-iana.json');
const OUTPUT_YAML_FILE = path.join(__dirname, '..', 'src', 'generated', 'windows-to-iana.yaml');

console.log('Fetching Windows timezone mappings from Unicode CLDR...');

https.get(CLDR_URL, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const mappings = parseWindowsZones(data);

      // Ensure output directory exists
      const generatedDir = path.dirname(OUTPUT_TS_FILE);
      if (!fs.existsSync(generatedDir)) {
        fs.mkdirSync(generatedDir, { recursive: true });
      }

      generateTypeScriptFile(mappings);
      generateJsonFile(mappings);
      generateYamlFile(mappings);

      console.log(`✅ Successfully updated ${Object.keys(mappings).length} timezone mappings`);
      console.log(`📁 TypeScript: ${OUTPUT_TS_FILE}`);
      console.log(`📁 JSON: ${OUTPUT_JSON_FILE}`);
      console.log(`📁 YAML: ${OUTPUT_YAML_FILE}`);
    } catch (error) {
      console.error('❌ Error parsing timezone data:', error.message);
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error('❌ Error fetching timezone data:', err.message);
  process.exit(1);
});

function parseWindowsZones(xmlData) {
  const mappings = {};

  // Extract mapZone elements with territory="001" (primary mappings)
  const mapZoneRegex = /<mapZone[^>]*other="([^"]*)"[^>]*territory="001"[^>]*type="([^"]*)"/g;

  let match;
  while ((match = mapZoneRegex.exec(xmlData)) !== null) {
    const windowsZone = match[1];
    const ianaZone = match[2];

    // Take the first IANA zone if multiple are specified
    const primaryIanaZone = ianaZone.split(' ')[0];

    mappings[windowsZone] = primaryIanaZone;
  }

  return mappings;
}

function generateTypeScriptFile(mappings) {
  const timestamp = new Date().toISOString();

  const content = `/**
 * Windows to IANA timezone mappings
 *
 * Generated from Unicode CLDR windowsZones.xml
 * Last updated: ${timestamp}
 * Source: https://github.com/unicode-org/cldr/blob/main/common/supplemental/windowsZones.xml
 *
 * To update this file, run: node scripts/update-timezones.js
 */

export const WINDOWS_TO_IANA_TIMEZONES: Record<string, string> = ${JSON.stringify(mappings, null, 2)};

/**
 * Get IANA timezone identifier for a Windows timezone name
 * @param windowsTimezone Windows timezone name (e.g., "Eastern Standard Time")
 * @returns IANA timezone identifier (e.g., "America/New_York") or undefined if not found
 */
export function getIanaTimezone(windowsTimezone: string): string | undefined {
  return WINDOWS_TO_IANA_TIMEZONES[windowsTimezone];
}

/**
 * Get all supported Windows timezone names
 * @returns Array of Windows timezone names
 */
export function getSupportedWindowsTimezones(): string[] {
  return Object.keys(WINDOWS_TO_IANA_TIMEZONES);
}
`;

  fs.writeFileSync(OUTPUT_TS_FILE, content, 'utf8');
}

function generateJsonFile(mappings) {
  const timestamp = new Date().toISOString();

  const jsonData = {
    metadata: {
      description: "Windows to IANA timezone mappings",
      source: "Unicode CLDR windowsZones.xml",
      sourceUrl: "https://github.com/unicode-org/cldr/blob/main/common/supplemental/windowsZones.xml",
      lastUpdated: timestamp,
      updateCommand: "node scripts/update-timezones.js",
      totalMappings: Object.keys(mappings).length
    },
    mappings: mappings
  };

  fs.writeFileSync(OUTPUT_JSON_FILE, JSON.stringify(jsonData, null, 2), 'utf8');
}

function generateYamlFile(mappings) {
  const timestamp = new Date().toISOString();

  let yamlContent = `# Windows to IANA timezone mappings
#
# Generated from Unicode CLDR windowsZones.xml
# Last updated: ${timestamp}
# Source: https://github.com/unicode-org/cldr/blob/main/common/supplemental/windowsZones.xml
#
# To update this file, run: node scripts/update-timezones.js

metadata:
  description: "Windows to IANA timezone mappings"
  source: "Unicode CLDR windowsZones.xml"
  sourceUrl: "https://github.com/unicode-org/cldr/blob/main/common/supplemental/windowsZones.xml"
  lastUpdated: "${timestamp}"
  updateCommand: "node scripts/update-timezones.js"
  totalMappings: ${Object.keys(mappings).length}

mappings:
`;

  // Convert mappings to YAML format
  for (const [windowsZone, ianaZone] of Object.entries(mappings)) {
    yamlContent += `  "${windowsZone}": "${ianaZone}"\n`;
  }

  fs.writeFileSync(OUTPUT_YAML_FILE, yamlContent, 'utf8');
}