/*
  sanity-studio/schemaTypes/case-study.js
  ---------------------------------------
  The form for one case study. The tabs follow the page from top to bottom:

    Listing     how the project appears on the home page tiles and the Work lists
    Overview    the top of the case study page (the same for every case study)
    Sections    everything below it: a list David builds himself for each case study.
                He adds a section, picks its kind, names it ("Goals", "First draft", "Research"…)
                and drags the sections into the order he wants.
    Search      what Google and link previews show

  The three kinds of section are textSection, listSection and numbersSection, defined below.

  The website's build step (build-website.js, "Content from Sanity") reads these same field
  names, so a field or section kind renamed here must be renamed there too.
*/
import {defineField, defineType} from 'sanity'

const describePicture = defineField({
  name: 'alt',
  title: 'Describe the picture',
  description: 'One short sentence saying what it shows. Read by search engines and screen readers.',
  type: 'string',
})

// A single picture with a description.
const picture = (name, title, group, description) =>
  defineField({name, title, group, description, type: 'image', fields: [describePicture]})

/* ---------- Fields shared by the kinds of section ---------- */

const sectionName = defineField({
  name: 'label',
  title: 'Section name',
  description: 'The small label above this section, and its entry in the contents list beside the page. Examples: Goals, Process, First draft, Research, Reflection',
  type: 'string',
  validation: (rule) => rule.required(),
})

const sectionHeading = defineField({
  name: 'heading',
  title: 'Heading',
  description: 'Optional. One line that sums the section up. Example: How I got there',
  type: 'string',
})

const sectionText = defineField({
  name: 'copy',
  title: 'Text',
  description: 'One box per paragraph.',
  type: 'array',
  of: [{type: 'text', rows: 4}],
})

const mediaCaption = defineField({
  name: 'caption',
  title: 'Caption',
  description: 'Optional. Shown underneath. Say what it shows and what changed.',
  type: 'string',
})

const sectionPictures = defineField({
  name: 'pictures',
  title: 'Pictures and videos',
  description:
    'Optional. One item shows on its own. Add two or more and visitors can click through them with an arrow. A section with none keeps the previous section’s picture on screen. Pictures can be JPG, PNG, WebP or an animated GIF. Videos play silently on a loop, like a GIF.',
  type: 'array',
  of: [
    {
      type: 'image',
      title: 'Picture or GIF',
      fields: [describePicture, mediaCaption],
    },
    {
      type: 'file',
      name: 'video',
      title: 'Video',
      description: 'An MP4 file. Keep it short and small: a screen recording of 5 to 30 seconds, ideally under 15 MB. It plays without sound, on a loop.',
      options: {accept: 'video/mp4,video/webm'},
      fields: [
        defineField({
          name: 'alt',
          title: 'Describe the video',
          description: 'One short sentence saying what it shows. Read by search engines and screen readers.',
          type: 'string',
        }),
        mediaCaption,
      ],
      preview: {
        select: {caption: 'caption', alt: 'alt', name: 'asset.originalFilename'},
        prepare: ({caption, alt, name}) => ({title: caption || alt || name || 'Video', subtitle: 'Video'}),
      },
    },
  ],
})

const sectionSmallPictures = defineField({
  name: 'supporting',
  title: 'Two smaller pictures',
  description: 'Optional. Up to two pictures shown side by side under the main one.',
  type: 'array',
  of: [{type: 'image', fields: [describePicture]}],
  validation: (rule) => rule.max(2),
})

/* ---------- The three kinds of section ---------- */

const textSection = {
  type: 'object',
  name: 'textSection',
  title: 'Text, pictures and video',
  fields: [sectionName, sectionHeading, sectionText, sectionPictures, sectionSmallPictures],
  preview: {
    select: {label: 'label', heading: 'heading', media: 'pictures.0'},
    prepare: ({label, heading, media}) => ({title: label || 'Untitled section', subtitle: ['Text and pictures', heading].filter(Boolean).join(' · '), media: media && media._type === 'image' ? media : undefined}),
  },
}

const listSection = {
  type: 'object',
  name: 'listSection',
  title: 'Numbered list',
  fields: [
    sectionName,
    sectionHeading,
    defineField({
      name: 'items',
      title: 'List',
      description: 'Shown as 1, 2, 3. Good for goals, steps or principles.',
      type: 'array',
      of: [{type: 'text', rows: 2}],
    }),
    sectionPictures,
  ],
  preview: {
    select: {label: 'label', heading: 'heading', media: 'pictures.0'},
    prepare: ({label, heading, media}) => ({title: label || 'Untitled section', subtitle: ['Numbered list', heading].filter(Boolean).join(' · '), media: media && media._type === 'image' ? media : undefined}),
  },
}

const numbersSection = {
  type: 'object',
  name: 'numbersSection',
  title: 'Numbers',
  fields: [
    sectionName,
    sectionHeading,
    sectionText,
    defineField({
      name: 'metrics',
      title: 'Numbers',
      description: 'Up to three. Each is a big number with a short label under it. They take the place of a picture.',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'metric',
          fields: [
            defineField({name: 'value', title: 'Number', type: 'string', description: 'Example: 45%'}),
            defineField({name: 'label', title: 'What changed', type: 'string', description: 'Example: fewer onboarding steps'}),
          ],
          preview: {select: {title: 'value', subtitle: 'label'}},
        },
      ],
      validation: (rule) => rule.max(3),
    }),
  ],
  preview: {
    select: {label: 'label', heading: 'heading'},
    prepare: ({label, heading}) => ({title: label || 'Untitled section', subtitle: ['Numbers', heading].filter(Boolean).join(' · ')}),
  },
}

/* ---------- The case study ---------- */

export default defineType({
  name: 'caseStudy',
  title: 'Case study',
  type: 'document',
  groups: [
    {name: 'listing', title: 'Listing', default: true},
    {name: 'overview', title: 'Overview'},
    {name: 'sections', title: 'Sections'},
    {name: 'search', title: 'Search'},
  ],
  fields: [
    /* ---------- Listing ---------- */
    defineField({
      name: 'name',
      title: 'Project name',
      description: 'Shown on the home page tile and the Work lists. Example: Dukacards',
      type: 'string',
      group: 'listing',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Web address',
      description: 'The last part of the page address: davidokunlola.com/work/THIS/. Click Generate. Changing it later breaks links people have saved.',
      type: 'slug',
      group: 'listing',
      options: {source: 'name', maxLength: 60},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'order',
      title: 'Position on the Work page',
      description: '1 is first. Also decides which project is suggested as "Next project".',
      type: 'number',
      group: 'listing',
      initialValue: 10,
    }),
    defineField({
      name: 'category',
      title: 'Category',
      description: 'One or two words. Example: Fintech',
      type: 'string',
      group: 'listing',
    }),
    defineField({
      name: 'summary',
      title: 'One-line summary',
      description: 'What it is, in a sentence. Example: A mobile card app and brand identity for a fintech product.',
      type: 'text',
      rows: 2,
      group: 'listing',
    }),
    defineField({
      name: 'role',
      title: 'Your role',
      description: 'Example: Product Designer, solo',
      type: 'string',
      group: 'listing',
    }),
    defineField({
      name: 'outcome',
      title: 'Outcome',
      description: 'One measured result. Example: Cut onboarding steps by 45%',
      type: 'string',
      group: 'listing',
    }),
    defineField({
      name: 'tileResult',
      title: 'Short outcome for the home tile',
      description: 'Optional. A few words, for the narrow tile on the home page. Leave empty to use the Outcome above.',
      type: 'string',
      group: 'listing',
    }),
    picture('cover', 'Cover picture (wide)', 'listing', 'Shown beside the project on the Work page. Best around 1360 × 840.'),
    picture('tilePicture', 'Home tile picture (tall)', 'listing', 'Optional. Fills the tall tile on the home page. Best around 800 × 1040.'),
    defineField({
      name: 'showOnHome',
      title: 'Show on the home page',
      type: 'boolean',
      group: 'listing',
      initialValue: true,
    }),
    defineField({
      name: 'homeOrder',
      title: 'Position on the home page',
      description: 'Optional. Leave empty to use the same position as the Work page.',
      type: 'number',
      group: 'listing',
      hidden: ({document}) => document?.showOnHome === false,
    }),
    defineField({
      name: 'showInProduct',
      title: 'List under Product design',
      type: 'boolean',
      group: 'listing',
      initialValue: true,
    }),
    defineField({
      name: 'showInBrand',
      title: 'List under Brand design',
      type: 'boolean',
      group: 'listing',
      initialValue: false,
    }),
    defineField({
      name: 'brandSummary',
      title: 'Summary for the Brand list',
      description: 'Optional. Used only on the Brand design list, when the brand side of the project needs its own sentence.',
      type: 'text',
      rows: 2,
      group: 'listing',
      hidden: ({document}) => !document?.showInBrand,
    }),
    defineField({
      name: 'brandRole',
      title: 'Role for the Brand list',
      description: 'Optional. Example: Brand identity',
      type: 'string',
      group: 'listing',
      hidden: ({document}) => !document?.showInBrand,
    }),

    /* ---------- Overview ---------- */
    defineField({
      name: 'title',
      title: 'Headline',
      description: 'The big title at the top of the case study. Say what changed, not just the product name.',
      type: 'string',
      group: 'overview',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'lead',
      title: 'Opening line',
      description: 'The problem you solved, in one line.',
      type: 'text',
      rows: 2,
      group: 'overview',
    }),
    defineField({
      name: 'intro',
      title: 'Second line',
      description: 'The solution, in one line.',
      type: 'text',
      rows: 3,
      group: 'overview',
    }),
    defineField({
      name: 'facts',
      title: 'Quick facts',
      description: 'The small table under the opening: Role, Timeline, Team, Outcome. Add, remove or reorder rows.',
      type: 'array',
      group: 'overview',
      of: [
        {
          type: 'object',
          name: 'fact',
          fields: [
            defineField({name: 'label', title: 'Label', type: 'string', description: 'Example: Timeline'}),
            defineField({name: 'value', title: 'Value', type: 'string', description: 'Example: August – September 2026'}),
          ],
          preview: {select: {title: 'label', subtitle: 'value'}},
        },
      ],
    }),
    defineField({
      name: 'links',
      title: 'Links',
      description: 'Optional. Prototype, live product and similar. A link with no address shows as "coming soon".',
      type: 'array',
      group: 'overview',
      of: [
        {
          type: 'object',
          name: 'link',
          fields: [
            defineField({name: 'label', title: 'Label', type: 'string', description: 'Example: Prototype'}),
            defineField({name: 'url', title: 'Address', type: 'url', validation: (rule) => rule.uri({scheme: ['http', 'https']})}),
            defineField({
              name: 'icon',
              title: 'Icon',
              type: 'string',
              initialValue: 'figma',
              options: {
                list: [
                  {title: 'Figma', value: 'figma'},
                  {title: 'Stigdata', value: 'stigdata'},
                ],
                layout: 'radio',
              },
            }),
          ],
          preview: {select: {title: 'label', subtitle: 'url'}},
        },
      ],
    }),
    picture('heroPicture', 'Main picture', 'overview', 'The first picture on the page, beside the headline.'),

    /* ---------- Sections ---------- */
    defineField({
      name: 'sections',
      title: 'Sections',
      description: 'Everything under the Overview. Click "Add item", pick a kind, and give it a name. Drag a section by its handle to move it. A section you remove disappears from the page and from the contents list.',
      type: 'array',
      group: 'sections',
      of: [textSection, listSection, numbersSection],
    }),

    /* ---------- Search ---------- */
    defineField({
      name: 'searchTitle',
      title: 'Search title',
      description: 'Optional. The blue title in Google and the browser tab. Leave empty to use the Headline. Keep it under 60 characters.',
      type: 'string',
      group: 'search',
      validation: (rule) => rule.max(70).warning('Google usually cuts titles longer than about 60 characters.'),
    }),
    defineField({
      name: 'searchDescription',
      title: 'Search description',
      description: 'The two grey lines under the title in Google, and the text in link previews. Say what the project was and what you did. Around 150 characters.',
      type: 'text',
      rows: 3,
      group: 'search',
      validation: (rule) => rule.max(180).warning('Google usually cuts descriptions longer than about 160 characters.'),
    }),
    defineField({
      name: 'hideFromSearch',
      title: 'Hide from search engines',
      description:
        'Leave this off for a finished case study. The site offers a case study to Google by itself once it has a Search description and no placeholder text in square brackets. Turn this on to keep one out of Google anyway.',
      type: 'boolean',
      group: 'search',
      initialValue: false,
    }),
  ],

  // (the last field: a way to keep a finished case study out of Google)
  orderings: [{title: 'Position on the Work page', name: 'order', by: [{field: 'order', direction: 'asc'}]}],

  preview: {
    select: {title: 'name', subtitle: 'category', media: 'cover'},
  },
})
