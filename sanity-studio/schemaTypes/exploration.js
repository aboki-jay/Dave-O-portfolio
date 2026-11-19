/*
  sanity-studio/schemaTypes/exploration.js
  ----------------------------------------
  The form for one exploration: a tile on the Exploration page's board.
  Pointing at the tile (or tapping it on a phone) shows the name, the description and the link.

  The website's build step (build-website.js, "Explorations from Sanity") reads these same field
  names, so a field renamed here must be renamed there too.
*/
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'exploration',
  title: 'Exploration',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      description: 'Example: Football-themed wedding invite',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'about',
      title: 'Description',
      description: 'One or two lines on what it is, what you were testing or what you made it with.',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'picture',
      title: 'Picture or GIF',
      description:
        'Shown on the tile. Landscape fills the tile best (the tiles are wider than they are tall); a tall picture sits in the middle with space either side. JPG, PNG, WebP or an animated GIF.',
      type: 'image',
      fields: [
        defineField({
          name: 'alt',
          title: 'Describe the picture',
          description: 'One short sentence saying what it shows. Read by search engines and screen readers.',
          type: 'string',
        }),
      ],
    }),
    defineField({
      name: 'video',
      title: 'Video (optional)',
      description:
        'An MP4 screen recording. If you add one it plays on the tile instead of the picture, silently and on a loop. The same video appears several times on the board, so keep it very small: 5 to 15 seconds and under 5 MB.',
      type: 'file',
      options: {accept: 'video/mp4,video/webm'},
    }),
    defineField({
      name: 'link',
      title: 'Link (optional)',
      description:
        'Where a click on the tile goes: a live page, a prototype, a post. Leave empty and a click shows the picture larger instead.',
      type: 'url',
      validation: (rule) => rule.uri({scheme: ['http', 'https']}),
    }),
    defineField({
      name: 'order',
      title: 'Order',
      description: 'Lower numbers come first. The board opens on the first exploration that has a picture.',
      type: 'number',
      initialValue: 10,
    }),
    defineField({
      name: 'showOnHome',
      title: 'Show in the Explorations list on the home page',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'homeNote',
      title: 'A few words for the home page list',
      description: 'Shown beside the name on the home page. Example: interactive website, GSAP',
      type: 'string',
      hidden: ({document}) => document?.showOnHome === false,
    }),
  ],
  orderings: [{title: 'Order on the board', name: 'order', by: [{field: 'order', direction: 'asc'}]}],
  preview: {
    select: {title: 'name', subtitle: 'about', media: 'picture'},
  },
})
