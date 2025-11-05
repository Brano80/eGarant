import MainMenu from '../MainMenu';

export default function MainMenuExample() {
  return (
    <MainMenu
      userName="Ján Novák"
      onCreateDocument={() => console.log('Create document')}
      onVerifyDocument={() => console.log('Verify document')}
      onMyContracts={() => console.log('My contracts')}
      onMyDocuments={() => console.log('My documents')}
      onVirtualOffice={() => console.log('Virtual office')}
      onBack={() => console.log('Back')}
      onLogoff={() => console.log('Logoff')}
    />
  );
}
