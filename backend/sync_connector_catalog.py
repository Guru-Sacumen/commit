from connector_catalog_sync import sync_connector_catalog_from_excel


if __name__ == "__main__":
    synced_rows = sync_connector_catalog_from_excel()
    print(f"[catalog] done: {synced_rows} rows")
