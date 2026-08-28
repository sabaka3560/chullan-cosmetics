import { CATALOG } from './catalog.js';

/**
 * Full ingredient disclosures, as supplied by the business.
 *
 *
 * TRANSCRIBED VERBATIM, AND DELIBERATELY NOT TIDIED
 *
 * These are a regulated disclosure, not marketing copy. Cosmetic ingredient
 * lists are what a buyer with an allergy reads before deciding whether a
 * product is safe for them, so the only acceptable relationship between this
 * file and the manufacturer's document is "identical". Nothing here is
 * corrected, reordered, or capitalised to taste.
 *
 * That includes the apparent spelling errors, which are listed in
 * `SUSPECTED_TYPOS` below rather than silently fixed. Several are one letter
 * away from a real INCI name — `Phenoxythanol` for Phenoxyethanol,
 * `Triethanlamine` for Triethanolamine — and guessing which was intended is
 * exactly the judgement a website is not entitled to make on a label. They need
 * confirming with whoever produced the document, and correcting at the source.
 *
 *
 * WHY ONE STRING PER PRODUCT RATHER THAN AN ARRAY
 *
 * The obvious modelling is a list of ingredients, split on the commas. It is
 * wrong here: `1,3 butylene glycol` contains a comma and splits into `1` and
 * `3 butylene glycol`, inventing an ingredient and destroying a real one. Other
 * entries carry internal punctuation for the same reason — `CI 77491/92/99`,
 * `Glyceryl stearate and PEG 100 stearate`.
 *
 * So the disclosure is stored exactly as written and rendered as a paragraph.
 * A prettier list is not worth a mangled label.
 *
 *
 * KEYED BY CATALOG ID
 *
 * The document names products differently from the catalog — "FINISHING SPRAY"
 * for Setting Spray, "LIQUID CONCEALER" for Concealer, "ANTI SHINE POWDER" for
 * Anti-Shine Powder. Keying by `id` rather than by name means the page shows
 * one set of product names (the catalog's) and a rename cannot leave a product
 * displaying its ingredients under a title that appears nowhere else on
 * the site. `ingredientsForCatalog()` asserts the two stay in step.
 */

export const INGREDIENTS: Record<string, string> = {
  moisturiser:
    'Jojoba oil, Coco butter, Vitamin E, Grape seed oil, Carrot oil, Glycerine, ' +
    'Glyceryl stearate and PEG 100 stearate, Poly acrylamide and c13-14 isoparaffin ' +
    'and laureth -7, Cyclopentasiloxane dimethicone /vinyl dimethicone cross polymer, ' +
    'Stearic acid, Hydroxy ethyl cellulose, Phenoxyethanol, Aqua and Fragrance.',

  sunscreen:
    'Aloe vera, Shea butter, Vitamin E, Vitamin c, Ethylhexyl methoxycinnamate, ' +
    'Butyl methoxydibenzoyl methane, Benzophenone -3, Phospholipids, ' +
    '1,3 butylene glycol, Glycerine, Glyceryl stearate and PEG 100 stearate, ' +
    'Poly acrylamide and c13-14 isoparaffin and laureth -7, Cyclopentasiloxane ' +
    'dimethicone /vinyl dimethicone cross polymer, Stearic acid, ' +
    'Hydroxy ethyl cellulose, Phenoxyethanol and Aqua.',

  'colour-corrector':
    'CASTOR OIL, MINERAL OIL, PARAFFIN WAX, OZOKERITE WAX, CARNAUBA WAX, ' +
    'CANDELILLA WAX, SHEA BUTTER, MICA, CI 77491, CI 77491/92/99, CI 77492, ' +
    'TITANIUM DIOXIDE.',

  'anti-shine-powder':
    'TALC, DIMETHICONE/VINYL DIMETHICONE CROSSPOLYMER (AND) SILICA, ' +
    'PEG-15/PPG-70 GLYCERYL ETHER/IPDI/DMPA CROSSPOLYMER, VITAMIN C, TOCOPHEROL.',

  'setting-spray':
    'DM-WATER PHENOXYETHANOL BUTYLENE GLYCOL CI 42090 ISODODECANE ' +
    'TRIMETHYLSILOXYSILICATE DIMETHICONE.',

  foundation:
    'Disteardimonium Hectorite, Cyclopentasiloxane, Ethylhexyl, Methoxycinnamate, ' +
    'Cera Alba, Caprylic/Capric Triglyceride, Glyceryl Stearate, Octadecanoic Acid, ' +
    'Cetyl Alcohol, Phenoxythanol, Sodium Chloride, Aqua, Dimethicome/Vinyl ' +
    'Dimethicone Crosspolymer & Silica, Alumina & Silica, Butyated Hydroxytoluene, ' +
    'Titanium Dioxide, CI77491, CI77492 & CI77499.',

  primer:
    'Carbomer, Tetrasodium Edta, Aqua, Glycerine, Isopropyl Myristate, ' +
    'Simmondsia Chinensis, Triethanlamine, Sorbitan Monolaurate, Phenoxythanol, ' +
    'Fragrance.',

  concealer:
    'Cyclopentasiloxane, Octyl Methoxycinnamate, Cera Alba, Glycerin & ' +
    'Caprylic/Capric, Triglyceride & Water & Prolyglycryl-10 Sterate, ' +
    'Octadecanoic Acid, Cetyl Alcohol, Phenoxythanol, Aqua, Dimethicone/Vinyl ' +
    'Dimethicone Crosspolymer & Silica, Alumina & Silica, Butylated ' +
    'Hydroxytoluene, Mica, Cyclopentasiloxane, Peg-10 Dimethicone, ' +
    'Disteradimounim, Hectorite, CI77891, CI77491, CI77492.',
};

/**
 * Spellings in the source document that look like errors, kept here rather than
 * applied to the lists above.
 *
 * Not a to-do for this repo. It is a question for the manufacturer, and the fix
 * belongs in the document these were transcribed from — otherwise the website
 * and the printed carton disagree about what is in the jar, which is worse than
 * either being wrong on its own.
 */
export const SUSPECTED_TYPOS = [
  { as_written: 'Phenoxythanol', likely: 'Phenoxyethanol', in: ['foundation', 'primer', 'concealer'] },
  { as_written: 'Dimethicome', likely: 'Dimethicone', in: ['foundation'] },
  { as_written: 'Butyated Hydroxytoluene', likely: 'Butylated Hydroxytoluene', in: ['foundation'] },
  { as_written: 'Triethanlamine', likely: 'Triethanolamine', in: ['primer'] },
  { as_written: 'Prolyglycryl-10 Sterate', likely: 'Polyglyceryl-10 Stearate', in: ['concealer'] },
  { as_written: 'Disteradimounim', likely: 'Disteardimonium', in: ['concealer'] },
] as const;

export type ProductIngredients = {
  id: string;
  name: string;
  size: string;
  list: string;
};

/**
 * The disclosures in catalog order, carrying each product's catalog name.
 *
 * Products with no entry are omitted rather than rendered empty: a heading with
 * nothing under it reads as "this product has no ingredients" rather than as
 * "we have not published them yet".
 */
export function ingredientsForCatalog(): ProductIngredients[] {
  return CATALOG.filter((product) => INGREDIENTS[product.id]).map((product) => ({
    id: product.id,
    name: product.name,
    size: product.size,
    list: INGREDIENTS[product.id],
  }));
}

/** Catalog products with no disclosure yet — surfaced so the gap is visible. */
export function productsMissingIngredients(): string[] {
  return CATALOG.filter((product) => !INGREDIENTS[product.id]).map((product) => product.id);
}
