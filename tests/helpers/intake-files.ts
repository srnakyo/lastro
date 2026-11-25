import { AlignmentType, Document, HeadingLevel, ImageRun, LevelFormat, Packer, Paragraph, Table, TableCell, TableRow, TextRun } from "docx";
import { PDFDocument, StandardFonts } from "pdf-lib";

/** Two different 1x1 PNG images, so a test can tell which one landed where. */
export const RED_PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
export const BLUE_PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));

const image = (data: Uint8Array) => new ImageRun({ type: "png", data, transformation: { width: 10, height: 10 } });
const numbered = (text: string) => new Paragraph({ text, numbering: { reference: "items", level: 0 } });

/**
 * A Word document with a heading, a paragraph with two images between its words, a paragraph with
 * one image, three numbered items, one bullet, a table and a second heading.
 */
export async function buildDocx(): Promise<Uint8Array> {
  const document = new Document({
    numbering: {
      config: [{ reference: "items", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.START }] }],
    },
    sections: [
      {
        children: [
          new Paragraph({ text: "Scope", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ children: [new TextRun("The invoice shows the discount.")] }),
          new Paragraph({ children: [new TextRun("Before "), image(RED_PNG), new TextRun(" between "), image(BLUE_PNG), new TextRun(" after.")] }),
          new Paragraph({ children: [image(BLUE_PNG)] }),
          numbered("First numbered item."),
          numbered("Second numbered item."),
          numbered("Third numbered item."),
          new Paragraph({ text: "A bullet point.", bullet: { level: 0 } }),
          new Table({
            rows: [
              new TableRow({ children: [new TableCell({ children: [new Paragraph("Seats")] }), new TableCell({ children: [new Paragraph("Discount")] })] }),
              new TableRow({ children: [new TableCell({ children: [new Paragraph("50")] }), new TableCell({ children: [new Paragraph("8%")] })] }),
            ],
          }),
          new Paragraph({ text: "Later", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ children: [new TextRun({ text: "Bold", bold: true }), new TextRun(" closing words.")] }),
        ],
      },
    ],
  });
  return new Uint8Array(await Packer.toBuffer(document));
}

/** Two pages: page 1 has a two-line block and a second block after a wide gap; page 2 one line. */
export async function buildPdf(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const first = pdf.addPage([600, 800]);
  first.drawText("The volume discount has to show", { x: 50, y: 750, size: 12, font });
  first.drawText("on the annual invoice.", { x: 50, y: 736, size: 12, font });
  first.drawText("Above 50 seats the discount is 8%.", { x: 50, y: 700, size: 12, font });
  const second = pdf.addPage([600, 800]);
  second.drawText("Second page text.", { x: 50, y: 750, size: 12, font });
  return pdf.save();
}
