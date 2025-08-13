declare module "leo-profanity" {
  const filter: {
    loadDictionary: (lang?: string) => void;
    check: (text: string) => boolean;
  };
  export default filter;
}
