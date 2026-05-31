declare module "html2pdf.js" {
  type Html2PdfChain = {
    from: (element: HTMLElement) => {
      save: () => Promise<void>;
    };
  };

  type Html2PdfFactory = () => {
    set: (options: Record<string, unknown>) => Html2PdfChain;
  };

  const html2pdf: Html2PdfFactory;
  export default html2pdf;
}
