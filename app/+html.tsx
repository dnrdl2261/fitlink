import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <title>FitLink</title>
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: htmlStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const htmlStyles = `
  *, *::before, *::after { box-sizing: border-box; }

  html, body {
    height: 100%;
    margin: 0;
    padding: 0;
    background-color: #06060D;
  }

  #root {
    display: flex;
    flex: 1;
    height: 100%;
    align-items: center;
    justify-content: center;
    background:
      radial-gradient(ellipse 60% 50% at 20% 20%, rgba(124,110,232,0.07) 0%, transparent 60%),
      radial-gradient(ellipse 50% 40% at 80% 80%, rgba(45,212,191,0.05) 0%, transparent 60%),
      #06060D;
  }
`;
